const { createDailyRoom, deleteRoom, getRoomParticipants } = require('../services/dailyService');
const Call = require('../models/CallModel');
const User = require('../models/UserModel');
const MessageDetail = require('../models/MessageDetailModel');
const Conversation = require('../models/ConversationModel');
const { v4: uuidv4 } = require('uuid');
const moment = require("moment-timezone");

class CallController {
    constructor() {
        this.activeCalls = new Map();
        this.userCalls = new Map();
        this.roomCheckIntervals = new Map(); // callId -> intervalId
    }

    async initiateCall(callerId, receiverId, callType = 'video') {
        try {
            // Kiểm tra user đã có cuộc gọi active chưa
            if (this.userCalls.has(callerId) || this.userCalls.has(receiverId)) {
                throw new Error('User is already in a call');
            }

            // Kiểm tra hai user có phải bạn bè không
            const caller = await User.findOne({ id: callerId });
            if (!caller || !caller.friendList || !caller.friendList.includes(receiverId)) {
                throw new Error('Cannot call non-friend user');
            }

            // Tạo room Daily.co
            const roomName = `call-${callerId}-${receiverId}-${Date.now()}`;
            const room = await createDailyRoom(roomName, callType);

            const callId = uuidv4();

            // Lưu thông tin call vào database
            const callData = await Call.create({
                idCall: callId,
                callerId,
                receiverId,
                callType,
                roomName: room.name || roomName,
                roomUrl: room.url,
                status: 'ringing'
            });

            // Lưu vào memory cache
            this.activeCalls.set(callId, callData);
            this.userCalls.set(callerId, callId);
            this.userCalls.set(receiverId, callId);

            // Tạo message detail cho cuộc gọi
            await this.createCallMessage(callerId, receiverId, callType, 'initiated', callId);

            return callData;
        } catch (error) {
            console.error('Error initiating call:', error);
            throw error;
        }
    }

    async acceptCall(callId, userId) {
        try {
            const callData = await Call.findOne({ idCall: callId });
            if (!callData) {
                throw new Error('Call not found');
            }

            if (callData.receiverId !== userId) {
                throw new Error('Unauthorized to accept this call');
            }

            // Cập nhật status và startTime
            callData.status = 'active';
            callData.startTime = new Date();
            await callData.save();

            // Cập nhật cache
            this.activeCalls.set(callId, callData);

            // Bắt đầu monitor room participants
            this.startRoomMonitoring(callId);

            // Tạo message detail cho việc chấp nhận cuộc gọi
            await this.createCallMessage(
                callData.callerId,
                callData.receiverId,
                callData.callType,
                'accepted',
                callId
            );

            return callData;
        } catch (error) {
            console.error('Error accepting call:', error);
            throw error;
        }
    }

    async rejectCall(callId, userId) {
        try {
            const callData = await Call.findOne({ idCall: callId });
            if (!callData) {
                throw new Error('Call not found');
            }

            if (callData.receiverId !== userId) {
                throw new Error('Unauthorized to reject this call');
            }

            await this.endCall(callId, userId, 'rejected');
            return { message: 'Call rejected' };
        } catch (error) {
            console.error('Error rejecting call:', error);
            throw error;
        }
    }

    async endCall(callId, userId, reason = 'normal') {
        try {
            const callData = await Call.findOne({ idCall: callId });
            if (!callData) {
                throw new Error('Call not found');
            }

            if (callData.callerId !== userId && callData.receiverId !== userId) {
                throw new Error('Unauthorized to end this call');
            }

            // Dừng room monitoring
            this.stopRoomMonitoring(callId);

            // Tính thời gian cuộc gọi
            const endTime = new Date();
            const duration = callData.startTime ? Math.floor((endTime - callData.startTime) / 1000) : 0;

            // Cập nhật call data
            callData.status = 'ended';
            callData.endTime = endTime;
            callData.duration = duration;
            callData.endReason = reason;
            await callData.save();

            // Kiểm tra số thành viên trong room TRƯỚC KHI xóa khỏi cache
            const otherUserId = callData.callerId === userId ? callData.receiverId : callData.callerId;
            const isOtherUserStillInCall = this.userCalls.has(otherUserId);

            // Xóa khỏi cache
            this.activeCalls.delete(callId);
            this.userCalls.delete(callData.callerId);
            this.userCalls.delete(callData.receiverId);

            // Xóa room Daily.co
            const shouldDeleteRoom = !isOtherUserStillInCall ||
                reason === 'rejected' ||
                reason === 'missed' ||
                reason === 'disconnected';

            if (shouldDeleteRoom) {
                try {
                    await deleteRoom(callData.roomName);
                    console.log(`Room ${callData.roomName} deleted successfully`);
                } catch (deleteError) {
                    console.error('Error deleting Daily.co room:', deleteError.message);
                }
            }

            // Tạo message detail cho việc kết thúc cuộc gọi
            await this.createCallMessage(
                callData.callerId,
                callData.receiverId,
                callData.callType,
                'ended',
                callId,
                { duration, reason }
            );

            return callData;
        } catch (error) {
            console.error('Error ending call:', error);
            throw error;
        }
    }

    // Thêm method mới để monitor room participants
    startRoomMonitoring(callId) {
        // Dừng monitoring cũ nếu có
        this.stopRoomMonitoring(callId);

        const intervalId = setInterval(async () => {
            try {
                await this.checkRoomParticipants(callId);
            } catch (error) {
                console.error(`Error monitoring room for call ${callId}:`, error);
                // Nếu có lỗi, dừng monitoring
                this.stopRoomMonitoring(callId);
            }
        }, 10000); // Kiểm tra mỗi 10 giây

        this.roomCheckIntervals.set(callId, intervalId);
        console.log(`Started room monitoring for call: ${callId}`);
    }

    stopRoomMonitoring(callId) {
        const intervalId = this.roomCheckIntervals.get(callId);
        if (intervalId) {
            clearInterval(intervalId);
            this.roomCheckIntervals.delete(callId);
            console.log(`Stopped room monitoring for call: ${callId}`);
        }
    }

    async checkRoomParticipants(callId) {
        try {
            const callData = this.activeCalls.get(callId);
            if (!callData || callData.status !== 'active') {
                this.stopRoomMonitoring(callId);
                return;
            }

            // Lấy thông tin participants từ Daily.co
            const participantsData = await getRoomParticipants(callData.roomName);
            const participantCount = participantsData.data ? participantsData.data.length : 0;

            console.log(`Room ${callData.roomName} has ${participantCount} participants`);

            // Nếu chỉ còn 1 người hoặc không còn ai trong room
            if (participantCount <= 1) {
                console.log(`Auto-ending call ${callId} due to insufficient participants (${participantCount})`);
                
                // Tìm user nào còn lại để end call
                const remainingUserId = this.findRemainingUser(callId);
                if (remainingUserId) {
                    await this.autoEndCall(callId, remainingUserId);
                } else {
                    // Nếu không tìm được user nào, cleanup trực tiếp
                    await this.forceCleanupCall(callId);
                }
            }
        } catch (error) {
            console.error(`Error checking participants for call ${callId}:`, error);
        }
    }

    findRemainingUser(callId) {
        const callData = this.activeCalls.get(callId);
        if (!callData) return null;

        // Kiểm tra xem user nào còn trong cache
        if (this.userCalls.has(callData.callerId)) {
            return callData.callerId;
        }
        if (this.userCalls.has(callData.receiverId)) {
            return callData.receiverId;
        }
        
        // Nếu cả hai đều không còn trong cache, trả về callerId
        return callData.callerId;
    }

    async autoEndCall(callId, userId) {
        try {
            const call = await this.endCall(callId, userId, 'auto_disconnect');
            
            // Thông báo cho cả hai user về việc auto-end call
            const socketController = require('./socketController');
            const io = require('../app').io; // Giả sử bạn export io từ app.js
            
            // Thông báo cho caller
            const callerSocket = socketController.getUser(call.callerId);
            if (callerSocket) {
                io.to(callerSocket.socketId).emit("call_auto_ended", {
                    callId: callId,
                    reason: 'auto_disconnect',
                    message: 'Cuộc gọi đã tự động kết thúc do chỉ còn một người trong phòng',
                    duration: call.duration
                });
            }

            // Thông báo cho receiver
            const receiverSocket = socketController.getUser(call.receiverId);
            if (receiverSocket) {
                io.to(receiverSocket.socketId).emit("call_auto_ended", {
                    callId: callId,
                    reason: 'auto_disconnect',
                    message: 'Cuộc gọi đã tự động kết thúc do chỉ còn một người trong phòng',
                    duration: call.duration
                });
            }

        } catch (error) {
            console.error('Error auto-ending call:', error);
            // Fallback: force cleanup
            await this.forceCleanupCall(callId);
        }
    }

    async forceCleanupCall(callId) {
        try {
            const callData = await Call.findOne({ idCall: callId });
            if (!callData || callData.status === 'ended') {
                return;
            }

            // Dừng monitoring
            this.stopRoomMonitoring(callId);

            // Cleanup database
            callData.status = 'ended';
            callData.endTime = new Date();
            callData.endReason = 'force_cleanup';
            const duration = callData.startTime ? Math.floor((new Date() - callData.startTime) / 1000) : 0;
            callData.duration = duration;
            await callData.save();

            // Cleanup cache
            this.activeCalls.delete(callId);
            this.userCalls.delete(callData.callerId);
            this.userCalls.delete(callData.receiverId);

            // Delete room
            try {
                await deleteRoom(callData.roomName);
                console.log(`Force cleanup: Room ${callData.roomName} deleted`);
            } catch (error) {
                console.error('Error force deleting room:', error);
            }

            // Create message
            await this.createCallMessage(
                callData.callerId,
                callData.receiverId,
                callData.callType,
                'ended',
                callId,
                { duration, reason: 'force_cleanup' }
            );

            console.log(`Force cleanup completed for call: ${callId}`);
        } catch (error) {
            console.error('Error in force cleanup:', error);
        }
    }

    // Cập nhật getEndReasonText để bao gồm lý do mới
    getEndReasonText(reason) {
        const reasonTexts = {
            'normal': 'Kết thúc bình thường',
            'rejected': 'Đã từ chối',
            'missed': 'Cuộc gọi nhỡ',
            'disconnected': 'Mất kết nối',
            'auto_disconnect': 'Tự động kết thúc do chỉ còn một người',
            'force_cleanup': 'Dọn dẹp tự động',
            'error': 'Lỗi hệ thống'
        };
        return reasonTexts[reason] || 'Đã kết thúc';
    }

    async createCallMessage(callerId, receiverId, callType, action, callId, additionalData = {}) {
        try {
            // Tìm hoặc tạo conversation giữa 2 user
            let conversation = await Conversation.findOne({
                $or: [
                    { idSender: callerId, idReceiver: receiverId },
                    { idSender: receiverId, idReceiver: callerId }
                ],
                isGroup: false
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    idConversation: uuidv4(),
                    idSender: callerId,
                    idReceiver: receiverId,
                    isGroup: false,
                    lastChange: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
                });
            }

            // Tạo nội dung message dựa trên action
            let content = '';
            let messageType = 'call';

            switch (action) {
                case 'initiated':
                    content = `Cuộc gọi ${callType === 'video' ? 'video' : 'thoại'} đã được khởi tạo`;
                    break;
                case 'accepted':
                    content = `Cuộc gọi ${callType === 'video' ? 'video' : 'thoại'} đã được chấp nhận`;
                    break;
                case 'ended':
                    const { duration = 0, reason = 'normal' } = additionalData;
                    const durationText = duration > 0 ?
                        `Thời gian: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}` :
                        'Cuộc gọi đã kết thúc';
                    content = `${durationText} - ${this.getEndReasonText(reason)}`;
                    break;
                default:
                    content = `Cuộc gọi ${callType === 'video' ? 'video' : 'thoại'}`;
            }

            // Tạo message detail
            const messageDetail = await MessageDetail.create({
                idMessage: uuidv4(),
                idSender: callerId,
                idReceiver: receiverId,
                idConversation: conversation.idConversation,
                type: messageType,
                content: content,
                dateTime: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
                isRead: false,
                callId: callId,
                callType: callType,
                callAction: action
            });

            // Cập nhật conversation
            await Conversation.findOneAndUpdate(
                { idConversation: conversation.idConversation },
                {
                    lastChange: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
                    idNewestMessage: messageDetail.idMessage
                }
            );

            return messageDetail;
        } catch (error) {
            console.error('Error creating call message:', error);
            throw error;
        }
    }

    getActiveCall(userId) {
        const callId = this.userCalls.get(userId);
        return callId ? this.activeCalls.get(callId) : null;
    }

    getUserCall(userId) {
        return this.userCalls.get(userId);
    }

    async getCallHistory(userId, limit = 20, skip = 0) {
        try {
            const calls = await Call.find({
                $or: [
                    { callerId: userId },
                    { receiverId: userId }
                ]
            })
                .sort({ startTime: -1 })
                .limit(limit)
                .skip(skip);

            return calls;
        } catch (error) {
            console.error('Error getting call history:', error);
            throw error;
        }
    }

    async getCallStatus(callId) {
        try {
            const call = await Call.findOne({ idCall: callId });
            return call ? call.status : null;
        } catch (error) {
            console.error('Error getting call status:', error);
            return null;
        }
    }

    async handleGetCallStatus(socket, payload) {
        try {
            const { callId } = payload;
            const status = await this.getCallStatus(callId);

            socket.emit("call_status_response", {
                success: true,
                callId: callId,
                status: status
            });
        } catch (error) {
            socket.emit("call_error", {
                success: false,
                message: error.message
            });
        }
    }

    // Socket event handlers
    async handleInitiateCall(io, socket, payload) {
        try {
            const { IDCaller, IDReceiver, callType = 'video' } = payload;

            // Lấy thông tin caller
            const caller = await User.findOne({ id: IDCaller }).select('id fullname urlavatar');
            if (!caller) {
                throw new Error('Caller not found');
            }

            const receiver = await User.findOne({ id: IDReceiver }).select('id fullname urlavatar');
            if (!receiver) {
                throw new Error('Receiver not found');
            }

            const call = await this.initiateCall(IDCaller, IDReceiver, callType);

            // Emit tới người gọi
            socket.emit("call_initiated", {
                success: true,
                call: call,
                roomUrl: call.roomUrl,
                caller: {
                    id: caller.id,
                    fullname: caller.fullname,
                    urlavatar: caller.urlavatar
                },
                receiver: {
                    id: receiver.id,
                    fullname: receiver.fullname,
                    urlavatar: receiver.urlavatar
                }
            });

            // Emit tới người nhận
            const socketController = require('./socketController');
            const receiverSocket = socketController.getUser(IDReceiver);
            if (receiverSocket) {
                io.to(receiverSocket.socketId).emit("incoming_call", {
                    callId: call.idCall,
                    caller: {
                        id: caller.id,
                        fullname: caller.fullname,
                        urlavatar: caller.urlavatar
                    },
                    receiver: {
                        id: receiver.id,
                        fullname: receiver.fullname,
                        urlavatar: receiver.urlavatar
                    },
                    callType: call.callType,
                    roomUrl: call.roomUrl
                });
            }
        } catch (error) {
            socket.emit("call_error", {
                success: false,
                message: error.message
            });
        }
    }

    async handleAcceptCall(io, socket, payload) {
        try {
            const { callId, userId } = payload;
            const call = await this.acceptCall(callId, userId);

            const caller = await User.findOne({ id: call.callerId }).select('id fullname urlavatar');
            if (!caller) {
                throw new Error('Caller not found');
            }

            const receiver = await User.findOne({ id: call.receiverId }).select('id fullname urlavatar');
            if (!receiver) {
                throw new Error('Receiver not found');
            }

            socket.emit("call_accepted_confirmed", {
                success: true,
                call: call,
                roomUrl: call.roomUrl,
                caller: {
                    id: caller.id,
                    fullname: caller.fullname,
                    urlavatar: caller.urlavatar
                },
            });

            // Thông báo cho người gọi
            const socketController = require('./socketController');
            const callerSocket = socketController.getUser(call.callerId);
            if (callerSocket) {
                io.to(callerSocket.socketId).emit("call_accepted", {
                    callId: call.idCall,
                    roomUrl: call.roomUrl,
                    receiver: {
                        id: receiver.id,
                        fullname: receiver.fullname,
                        urlavatar: receiver.urlavatar
                    },
                });
            }
        } catch (error) {
            socket.emit("call_error", {
                success: false,
                message: error.message
            });
        }
    }

    async handleRejectCall(io, socket, payload) {
        try {
            const { callId, userId } = payload;
            await this.rejectCall(callId, userId);

            socket.emit("call_rejected_confirmed", {
                success: true,
                message: "Call rejected"
            });

            // Thông báo cho người gọi
            const call = await Call.findOne({ idCall: callId });
            if (call) {
                const socketController = require('./socketController');
                const callerSocket = socketController.getUser(call.callerId);

                const receiver = await User.findOne({ id: call.receiverId }).select('id fullname urlavatar');
                if (!receiver) {
                    throw new Error('Receiver not found');
                }

                if (callerSocket) {
                    io.to(callerSocket.socketId).emit("call_rejected", {
                        callId: callId,
                        rejectedBy: {
                            id: receiver.id,
                            fullname: receiver.fullname,
                            urlavatar: receiver.urlavatar
                        },
                        receiver: {
                            id: receiver.id,
                            fullname: receiver.fullname,
                            urlavatar: receiver.urlavatar
                        },
                        timestamp: new Date()
                    });
                }
            }
        } catch (error) {
            socket.emit("call_error", {
                success: false,
                message: error.message
            });
        }
    }

    async handleEndCall(io, socket, payload) {
        try {
            const { callId, userId, reason = 'normal' } = payload;
            const call = await this.endCall(callId, userId, reason);

            socket.emit("call_ended_confirmed", {
                success: true,
                call: call,
            });

            // Thông báo cho người kia
            const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
            const socketController = require('./socketController');
            const otherUserSocket = socketController.getUser(otherUserId);
            if (otherUserSocket) {
                io.to(otherUserSocket.socketId).emit("call_ended", {
                    callId: callId,
                    reason: reason,
                    duration: call.duration
                });
            }

        } catch (error) {
            socket.emit("call_error", {
                success: false,
                message: error.message
            });
        }
    }

    async handleGetActiveCall(socket, payload) {
        try {
            const { userId } = payload;
            const activeCall = this.getActiveCall(userId);

            socket.emit("active_call_response", {
                success: true,
                activeCall: activeCall
            });
        } catch (error) {
            socket.emit("call_error", {
                success: false,
                message: error.message
            });
        }
    }

    async handleCallTimeout(io, socket, payload) {
        try {
            const { callId, userId } = payload;
            const call = await this.endCall(callId, userId, 'missed');

            socket.emit("call_timeout_confirmed", {
                success: true,
                call: call
            });

            // Thông báo cho người gọi
            const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
            const socketController = require('./socketController');
            const otherUserSocket = socketController.getUser(otherUserId);
            if (otherUserSocket) {
                io.to(otherUserSocket.socketId).emit("call_missed", {
                    callId: callId,
                    missedBy: userId
                });
            }
        } catch (error) {
            socket.emit("call_error", {
                success: false,
                message: error.message
            });
        }
    }

    // Main socket handler
    handleCallEvents(io, socket) {
        // Khởi tạo cuộc gọi
        socket.on("initiate_call", (payload) => {
            this.handleInitiateCall(io, socket, payload);
        });

        // Chấp nhận cuộc gọi
        socket.on("accept_call", (payload) => {
            this.handleAcceptCall(io, socket, payload);
        });

        // Từ chối cuộc gọi
        socket.on("reject_call", (payload) => {
            this.handleRejectCall(io, socket, payload);
        });

        // Kết thúc cuộc gọi
        socket.on("end_call", (payload) => {
            this.handleEndCall(io, socket, payload);
        });

        // Lấy cuộc gọi đang active
        socket.on("get_active_call", (payload) => {
            this.handleGetActiveCall(socket, payload);
        });

        socket.on("call_timeout", (payload) => {
            this.handleCallTimeout(io, socket, payload);
        });

        socket.on("get_call_status", (payload) => {
            this.handleGetCallStatus(socket, payload);
        });
    }

    // Cleanup when user disconnects
    async handleUserDisconnect(userId) {
        try {
            const activeCall = this.getActiveCall(userId);
            if (activeCall) {
                await this.endCall(activeCall.idCall, userId, 'disconnected');
            }
        } catch (error) {
            console.error('Error handling user disconnect for calls:', error);
        }
    }

    // Cleanup tất cả monitoring khi shutdown
    cleanup() {
        console.log('Cleaning up all room monitoring intervals...');
        for (const [callId, intervalId] of this.roomCheckIntervals) {
            clearInterval(intervalId);
            console.log(`Cleaned up monitoring for call: ${callId}`);
        }
        this.roomCheckIntervals.clear();
    }
}

module.exports = new CallController();