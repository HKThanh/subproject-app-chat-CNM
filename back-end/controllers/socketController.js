const MessageController = require("./MessageController");
const MessageDetailController = require("./MessageDetailController");
const Conversation = require("../models/ConversationModel");
const { v4: uuidv4 } = require("uuid");
const s3 = require("../config/connectS3");
const MessageDetail = require("../models/MessageDetailModel");
const User = require("../models/UserModel");
const MessageBucket = require("../models/MessageBucketModel");
const moment = require("moment-timezone");

let onlineUsers = [];

const addNewUser = (phone, socketId) => {
    !onlineUsers.some((user) => user.phone === phone) &&
        onlineUsers.push({ phone, socketId });
};

const removeUser = (socketId) => {
    onlineUsers = onlineUsers.filter((item) => item.socketId !== socketId);
};

const getUser = (phone) => {
    return onlineUsers.find((user) => user.phone === phone);
};

const handleUserOnline = (socket) => {
    socket.on("new_user_connect", async (payload) => {
        try {
            const { phone } = payload;
            addNewUser(phone, socket.id);
            socket.join(phone);

            // Load unread messages khi user online
            const unreadMessages = await MessageDetail.find({
                idReceiver: phone,
                isRead: false
            })
            .sort({ dateTime: 1 })
            .populate('idSender', 'fullname avatar'); 

            if (unreadMessages.length > 0) {
                socket.emit("unread_messages", {
                    messages: unreadMessages,
                    count: unreadMessages.length
                });
            }

            socket.emit("connection_success", {
                message: "Connected successfully",
                socketId: socket.id
            });
        } catch (error) {
            console.error("Error handling user online:", error);
        }
    });
};

const handleLoadConversation = (io, socket) => {
    socket.on("load_conversations", async (payload) => {
        try {
            const { IDUser, lastEvaluatedKey } = payload;
            const skip = lastEvaluatedKey ? parseInt(lastEvaluatedKey) : 0;
            const limit = 10;

            // Chỉ query theo idSender và groupMembers
            const conversations = await Conversation.find({
                $or: [
                    { idSender: IDUser },
                    { groupMembers: IDUser }
                ]
            })
            .sort({ lastChange: -1 })
            .skip(skip)
            .limit(limit);

            // Tính tổng số conversation
            const total = await Conversation.countDocuments({
                $or: [
                    { idSender: IDUser },
                    { groupMembers: IDUser }
                ]
            });

            const hasMore = total > skip + limit;

            socket.emit("load_conversations_response", {
                Items: conversations,
                LastEvaluatedKey: hasMore ? skip + limit : null
            });

        } catch (error) {
            console.error("Error loading conversations:", error);
            socket.emit("error", { 
                message: "Lỗi khi tải cuộc trò chuyện" 
            });
        }
    });
};

const handleTextMessage = async (IDSender, IDConversation, textMessage) => {
    const message = await MessageDetailController.createTextMessageDetail(
        IDSender,
        IDConversation,
        textMessage
    );
    return message;
};

const updateLastChangeConversation = async (idConversation, idMessage) => {
    try {
        const conversation = await Conversation.findOneAndUpdate(
            { idConversation: idConversation },
            {
                lastChange: new Date().toISOString(),
                idNewestMessage: idMessage
            },
            { new: true }
        );
        return conversation;
    } catch (error) {
        console.error("Error updating conversation:", error);
        throw error;
    }
};

const uploadFileToS3 = async (file, fileType) => {
    const bucketMap = {
        'image': 'imagetintin',
        'video': 'videotintin',
        'document': 'documenttintin'
    };

    const params = {
        Bucket: bucketMap[fileType] || 'documenttintin',
        Key: `${uuidv4()}_${file.fileName}`,
        Body: file.content,
        ContentType: file.mimeType
    };

    try {
        const data = await s3.upload(params).promise();
        return data.Location;
    } catch (error) {
        console.error("Error uploading to S3:", error);
        throw error;
    }
};

const handleSendFile = async (io, socket) => {
    socket.on("send_file", async (payload) => {
        try {
            const { idSender, idConversation, file } = payload;
            const { type, content, fileName } = file;

            // Upload to S3
            const params = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `${uuidv4()}_${fileName}`,
                Body: content,
                ContentType: type
            };

            const uploadedFile = await s3.upload(params).promise();

            // Create message
            const newMessage = await MessageDetail.create({
                idMessage: uuidv4(),
                idSender,
                idConversation,
                type: 'file',
                content: uploadedFile.Location,
                dateTime: new Date().toISOString()
            });

            // Get conversation to find receiver
            const conversation = await Conversation.findOne({ idConversation });
            const idReceiver = conversation.idSender === idSender ? 
                             conversation.idReceiver : conversation.idSender;

            // Emit to conversation room
            io.to(idConversation).emit("receive_message", newMessage);

            // Emit success to sender
            socket.emit("send_message_success", {
                conversationId: idConversation,
                message: newMessage
            });

            // Emit to specific receiver if online
            const receiverOnline = getUser(idReceiver);
            if (receiverOnline) {
                io.to(receiverOnline.socketId).emit("receive_message", newMessage);
            }

            await updateLastChangeConversation(idConversation, newMessage.idMessage);

        } catch (error) {
            console.error("Error sending file:", error);
            socket.emit("error", { 
                message: "Lỗi khi gửi file",
                error: error.message 
            });
        }
    });
};

const handleSendMessage = async (io, socket) => {
    socket.on("send_message", async (payload) => {
        try {
            const { IDSender, IDReceiver, textMessage } = payload;
            console.log("Payload:", payload);

            const receiverUser = await User.findOne({ id: IDReceiver });
            if (!receiverUser) {
                throw new Error("Receiver not found");
            }

            let conversation = await Conversation.findOne({
                $or: [
                    { idSender: IDSender, idReceiver: IDReceiver },
                    { idSender: IDReceiver, idReceiver: IDSender }
                ]
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    idConversation: uuidv4(),
                    idSender: IDSender,
                    idReceiver: IDReceiver,
                    isGroup: false,
                    lastChange: new Date().toISOString()
                });
            }

            // Thêm idReceiver khi tạo tin nhắn
            const messageDetail = await MessageDetail.create({
                idMessage: uuidv4(),
                idSender: IDSender,
                idReceiver: IDReceiver, // Thêm dòng này
                idConversation: conversation.idConversation,
                type: 'text',
                content: textMessage,
                dateTime: new Date().toISOString(),
                isRead: false
            });

            await updateLastChangeConversation(
                conversation.idConversation,
                messageDetail.idMessage
            );

            const receiverOnline = getUser(IDReceiver);
            if (receiverOnline) {
                io.to(receiverOnline.socketId).emit("receive_message", {
                    ...messageDetail.toObject(),
                    senderInfo: { id: IDSender }
                });
            }

            socket.emit("send_message_success", {
                conversationId: conversation.idConversation,
                message: messageDetail
            });

        } catch (error) {
            console.error("Error sending message:", error);
            socket.emit("send_message_error", { 
                message: "Lỗi khi gửi tin nhắn",
                error: error.message 
            });
        }
    });
};

const handleDeleteMessage = async (io, socket) => {
    socket.on("delete_message", async (payload) => {
        try {
            const { idMessage, idSender } = payload;
            const message = await MessageDetail.findOneAndUpdate(
                { idMessage },
                { isRemove: true },
                { new: true }
            );
            
            if (message) {
                socket.emit("message_deleted", {
                    messageId: idMessage,
                    updatedMessage: message
                });
            }
        } catch (error) {
            socket.emit("error", { message: "Lỗi khi xóa tin nhắn" });
        }
    });
};

const handleRecallMessage = async (io, socket) => {
    socket.on("recall_message", async (payload) => {
        try {
            const { idMessage, idConversation } = payload;
            
            // Tìm và cập nhật tin nhắn
            const message = await MessageDetail.findOneAndUpdate(
                { idMessage },
                { 
                    isRecall: true,
                    content: "Tin nhắn đã được thu hồi"
                },
                { new: true }
            ).populate('idSender', 'id'); // Lấy thêm thông tin sender

            if (!message) {
                throw new Error("Không tìm thấy tin nhắn");
            }

            // Tìm receiver để gửi thông báo
            const conversation = await Conversation.findOne({ idConversation });
            const idReceiver = conversation.idSender === message.idSender.id ? 
                             conversation.idReceiver : conversation.idSender;

            // Emit tới tất cả users trong conversation
            io.to(idConversation).emit("message_recalled", {
                messageId: idMessage,
                updatedMessage: {
                    ...message.toObject(),
                    isRecall: true,
                    content: "Tin nhắn đã được thu hồi"
                }
            });

            // Emit riêng cho receiver nếu online
            const receiverOnline = getUser(idReceiver);
            if (receiverOnline) {
                io.to(receiverOnline.socketId).emit("message_recalled", {
                    messageId: idMessage,
                    updatedMessage: {
                        ...message.toObject(),
                        isRecall: true,
                        content: "Tin nhắn đã được thu hồi"
                    }
                });
            }

            // Emit success về cho người thu hồi
            socket.emit("recall_message_success", {
                messageId: idMessage,
                success: true
            });

        } catch (error) {
            console.error("Error recalling message:", error);
            socket.emit("error", { 
                message: "Lỗi khi thu hồi tin nhắn",
                error: error.message 
            });
        }
    });
};

const handleForwardMessage = async (io, socket) => {
    socket.on("forward_message", async (payload) => {
        try {
            const { IDMessageDetail, targetConversations, IDSender } = payload;
            
            const originalMessage = await MessageDetail.findOne({ idMessage: IDMessageDetail });
            
            if (!originalMessage) {
                throw new Error("Message not found");
            }

            const results = [];
            const userSender = await User.findOne({ id: IDSender });
            
            for (const IDConversation of targetConversations) {
                const forwardedMessage = await MessageDetail.create({
                    idMessage: uuidv4(),
                    idSender: IDSender,
                    idConversation: IDConversation,
                    type: originalMessage.type,
                    content: originalMessage.content,
                    dateTime: new Date().toISOString(),
                    isForward: true
                });

                await updateLastChangeConversation(
                    IDConversation,
                    forwardedMessage.idMessage
                );

                io.to(IDConversation).emit("receive_message", {
                    ...forwardedMessage.toObject(),
                    userSender
                });

                results.push({
                    conversationId: IDConversation,
                    messageId: forwardedMessage.idMessage
                });
            }

            socket.emit("forward_message_success", { results });
        } catch (error) {
            console.error("Error forwarding message:", error);
            socket.emit("error", { message: "Lỗi khi chuyển tiếp tin nhắn" });
        }
    });
};

const getUserBySocketId = (socketId) => {
    return onlineUsers.find((user) => user.socketId === socketId);
};

const handleMarkMessageRead = (socket) => {
    socket.on("mark_message_read", async (payload) => {
        try {
            const { messageId } = payload;
            await MessageDetail.findOneAndUpdate(
                { idMessage: messageId },
                { isRead: true }
            );
        } catch (error) {
            console.error("Error marking message as read:", error);
        }
    });
};

// Handler để đánh dấu tin nhắn đã đọc khi user click vào conversation hoặc tin nhắn
const handleMarkMessagesRead = (socket) => {
    socket.on("mark_messages_read", async (payload) => {
        try {
            const { conversationId, receiverId } = payload;
            console.log("Marking messages read - Conversation:", conversationId, "Receiver:", receiverId);

            // Query để tìm và update tin nhắn chưa đọc
            const result = await MessageDetail.updateMany(
                {
                    idConversation: conversationId,
                    idReceiver: receiverId,
                    isRead: false
                },
                { isRead: true }
            );

            console.log("Update result:", result);

            // Emit kết quả
            socket.emit("messages_marked_read", {
                conversationId,
                receiverId,
                success: true,
                updatedCount: result.modifiedCount
            });

        } catch (error) {
            console.error("Error marking messages as read:", error);
            socket.emit("error", { 
                message: "Lỗi khi đánh dấu tin nhắn đã đọc",
                error: error.message 
            });
        }
    });
};

const handleLoadMessages = (io, socket) => {
    socket.on("load_messages", async (payload) => {
        try {
            const { IDConversation, lastMessageId, limit = 20 } = payload;
            
            let query = {
                idConversation: IDConversation
            };

            if (lastMessageId) {
                const lastMessage = await MessageDetail.findOne({ idMessage: lastMessageId });
                if (lastMessage) {
                    query.dateTime = { $lt: lastMessage.dateTime };
                }
            }

            const messages = await MessageDetail.find(query)
                .sort({ dateTime: -1 })
                .limit(limit);

            // Chỉ format dateTime, không cần xử lý content vì đã được set khi recall
            const processedMessages = messages.map(msg => ({
                ...msg.toJSON(),
                dateTime: moment.tz(msg.dateTime, "Asia/Ho_Chi_Minh").format()
            }));

            socket.emit("load_messages_response", {
                messages: processedMessages,
                hasMore: messages.length === limit,
                conversationId: IDConversation
            });

        } catch (error) {
            console.error("Error loading messages:", error);
            socket.emit("error", {
                message: "Lỗi khi tải tin nhắn",
                error: error.message
            });
        }
    });
};

module.exports = {
    handleUserOnline,
    handleLoadConversation,
    handleSendMessage,
    handleSendFile,
    handleDeleteMessage,
    handleRecallMessage,
    handleForwardMessage,
    getUserBySocketId,
    getUser,
    handleMarkMessageRead,
    handleMarkMessagesRead,
    handleLoadMessages
};
