const { createDailyRoom } = require('../services/dailyService');
const Call = require('../models/CallModel');
const User = require('../models/UserModel');
const MessageDetail = require('../models/MessageDetailModel');
const Conversation = require('../models/ConversationModel');
const { v4: uuidv4 } = require('uuid');
const moment = require("moment-timezone");

class CallController {
    constructor() {
        this.activeCalls = new Map(); // callId -> callData
        this.userCalls = new Map();   // userId -> callId
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
            const room = await createDailyRoom(roomName);
            
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

            // Cập nhật status
            callData.status = 'active';
            await callData.save();

            // Cập nhật cache
            this.activeCalls.set(callId, callData);

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

            // Tính thời gian cuộc gọi
            const endTime = new Date();
            const duration = Math.floor((endTime - callData.startTime) / 1000);

            // Cập nhật call data
            callData.status = 'ended';
            callData.endTime = endTime;
            callData.duration = duration;
            callData.endReason = reason;
            await callData.save();

            // Xóa khỏi cache
            this.activeCalls.delete(callId);
            this.userCalls.delete(callData.callerId);
            this.userCalls.delete(callData.receiverId);

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

    getEndReasonText(reason) {
        const reasonTexts = {
            'normal': 'Kết thúc bình thường',
            'rejected': 'Đã từ chối',
            'missed': 'Cuộc gọi nhỡ',
            'disconnected': 'Mất kết nối',
            'error': 'Lỗi hệ thống'
        };
        return reasonTexts[reason] || 'Đã kết thúc';
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

    // Socket event handlers
    async handleInitiateCall(io, socket, payload) {
        try {
            const { IDCaller, IDReceiver, callType = 'video' } = payload;
            
            // Lấy thông tin caller
            const caller = await User.findOne({ id: IDCaller }).select('id fullname urlavatar');
            if (!caller) {
                throw new Error('Caller not found');
            }

            const call = await this.initiateCall(IDCaller, IDReceiver, callType);
            
            // Emit tới người gọi
            socket.emit("call_initiated", {
                success: true,
                call: call,
                roomUrl: call.roomUrl
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
            
            socket.emit("call_accepted_confirmed", {
                success: true,
                call: call,
                roomUrl: call.roomUrl
            });

            // Thông báo cho người gọi
            const socketController = require('./socketController');
            const callerSocket = socketController.getUser(call.callerId);
            if (callerSocket) {
                io.to(callerSocket.socketId).emit("call_accepted", {
                    callId: call.idCall,
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
                if (callerSocket) {
                    io.to(callerSocket.socketId).emit("call_rejected", {
                        callId: callId
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
                call: call
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
}

module.exports = new CallController();