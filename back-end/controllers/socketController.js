const MessageController = require("./messageController");
const MessageDetailController = require("./messageDetailController");
const Conversation = require("../models/ConversationModel");
const { v4: uuidv4 } = require("uuid");
const s3 = require("../config/connectS3");

// Mảng lưu trữ thông tin người dùng đang online
let onlineUsers = [];

/**
 * Thêm người dùng mới vào danh sách online
 * @param {string} phone - Số điện thoại người dùng
 * @param {string} socketId - ID socket của người dùng
 */
const addNewUser = (phone, socketId) => {
    !onlineUsers.some((user) => user.phone === phone) &&
        onlineUsers.push({ phone, socketId });
};

/**
 * Xóa người dùng khỏi danh sách online khi disconnect
 * @param {string} socketId - ID socket cần xóa
 */
const removeUser = (socketId) => {
    onlineUsers = onlineUsers.filter((item) => item.socketId !== socketId);
};

/**
 * Tìm thông tin người dùng trong danh sách online
 * @param {string} phone - Số điện thoại cần tìm
 * @returns {Object|undefined} Thông tin người dùng nếu tìm thấy
 */
const getUser = (phone) => {
    return onlineUsers.find((user) => user.phone === phone);
};

/**
 * Xử lý sự kiện người dùng kết nối mới
 * Được gọi khi client emit "new_user_connect"
 */
const handleUserOnline = (socket) => {
    socket.on("new_user_connect", async (payload) => {
        addNewUser(payload.phone, socket.id);
        console.log("User connected:", payload.phone);
    });

    socket.on("disconnect", () => {
        removeUser(socket.id);
        console.log("User disconnected");
    });
};

/**
 * Xử lý tải danh sách cuộc trò chuyện
 * Được gọi khi client emit "load_conversations"
 */
const handleLoadConversation = async (io, socket) => {
    socket.on("load_conversations", async (payload) => {
        try {
            // Query lấy tất cả conversation của user
            const conversations = await Conversation.query("idSender")
                                                 .eq(payload.phone)
                                                 .exec();
            // Trả về danh sách cho client
            socket.emit("load_conversations_response", conversations);
        } catch (error) {
            console.error("Error loading conversations:", error);
            socket.emit("error", { message: "Lỗi khi tải cuộc trò chuyện" });
        }
    });
};

/**
 * Xử lý gửi tin nhắn text
 * @param {string} IDSender - ID người gửi
 * @param {string} IDConversation - ID cuộc trò chuyện
 * @param {string} textMessage - Nội dung tin nhắn
 */
const handleTextMessage = async (IDSender, IDConversation, textMessage) => {
    const message = await MessageDetailController.createTextMessageDetail(
        IDSender,
        IDConversation,
        textMessage
    );
    return message;
};

/**
 * Cập nhật thời gian thay đổi cuối cùng của cuộc trò chuyện
 */
const updateLastChangeConversation = async (IDConversation, IDMessage) => {
    const conversation = await Conversation.get(IDConversation);
    if (conversation) {
        conversation.lastChange = new Date().toISOString();
        conversation.idNewestMessage = IDMessage;
        await conversation.save();
    }
};

// Hàm xử lý upload file lên S3
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
    return data.Location; // URL của file trên S3
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
};

// Hàm xử lý gửi file
const handleSendFile = async (io, socket) => {
    socket.on("send_file", async (payload) => {
        try {
            const { idSender, idConversation, file } = payload;
            const { type, content, fileName } = file;

            // Upload file lên S3
            const params = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `${uuidv4()}_${fileName}`,
                Body: content,
                ContentType: type
            };

            const uploadedFile = await s3.upload(params).promise();

            // Tạo message detail mới
            const newMessage = await MessageDetail.create({
                idMessage: uuidv4(),
                idSender,
                idConversation,
                type: 'file',
                content: uploadedFile.Location,
                dateTime: new Date().toISOString()
            });

            // Gửi tin nhắn cho tất cả người trong cuộc trò chuyện
            io.to(idConversation).emit("receive_message", newMessage);

            // Cập nhật conversation
            await updateLastChangeConversation(idConversation, newMessage.idMessage);

        } catch (error) {
            socket.emit("error", { message: "Lỗi khi gửi file" });
        }
    });
};

/**
 * Xử lý gửi tin nhắn
 * Được gọi khi client emit "send_message"
 */
const handleSendMessage = async (io, socket) => {
    socket.on("send_message", async (payload) => {
        try {
            const { IDSender, IDReceiver, textMessage, files } = payload;

            // Kiểm tra hoặc tạo conversation mới
            let conversation = await Conversation.get({
                idSender: IDSender,
                idReceiver: IDReceiver
            });

            if (!conversation) {
                conversation = await Conversation.create({
                    idConversation: uuidv4(),
                    idSender: IDSender,
                    idReceiver: IDReceiver,
                    lastChange: new Date().toISOString()
                });
            }

            if (files && files.length > 0) {
                // Xử lý từng file
                for (const file of files) {
                    const messageDetail = await handleSendFile(
                        IDSender,
                        conversation.idConversation,
                        file
                    );

                    // Gửi tin nhắn đến tất cả người trong cuộc trò chuyện
                    io.to(conversation.idConversation).emit("receive_message", {
                        ...messageDetail,
                        senderInfo: { id: IDSender }
                    });

                    // Cập nhật lastChange của conversation
                    await updateLastChangeConversation(
                        conversation.idConversation,
                        messageDetail.idMessage
                    );
                }
            } else if (textMessage) {
                // Xử lý tin nhắn text
                const messageDetail = await handleTextMessage(
                    IDSender,
                    conversation.idConversation,
                    textMessage
                );

                // Gửi tin nhắn đến tất cả người trong cuộc trò chuyện
                io.to(conversation.idConversation).emit("receive_message", {
                    ...messageDetail,
                    senderInfo: { id: IDSender }
                });

                // Cập nhật lastChange của conversation
                await updateLastChangeConversation(
                    conversation.idConversation,
                    messageDetail.idMessage
                );
            }

            // Thông báo gửi thành công về cho người gửi
            socket.emit("send_message_success", {
                conversationId: conversation.idConversation
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
            const message = await MessageDetail.get(idMessage);
            
            if (message) {
                // Thêm ID người xóa vào mảng deletedFor
                message.isRemove = idSender;
                const updatedMessage = await MessageDetail.update(message);
                
                // Chỉ gửi thông báo cho người xóa
                socket.emit("message_deleted", {
                    messageId: idMessage,
                    updatedMessage
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
            const message = await MessageDetail.get(idMessage);
            
            if (message) {
                message.isRecall = true;
                const updatedMessage = await MessageDetail.update(message);
                
                // Gửi thông báo cho tất cả người trong cuộc trò chuyện
                io.to(idConversation).emit("message_recalled", {
                    messageId: idMessage,
                    updatedMessage
                });
            }
        } catch (error) {
            socket.emit("error", { message: "Lỗi khi thu hồi tin nhắn" });
        }
    });
};
const handleForwardMessage = async (io, socket) => {
    socket.on("forward_message", async (payload) => {
        try {
            const { IDMessageDetail, targetConversations, IDSender } = payload;
            
            // Lấy tin nhắn gốc cần forward
            const originalMessage = await MessageDetailModel.get(IDMessageDetail);
            
            if (!originalMessage) {
                throw new Error("Message not found");
            }

            const results = [];
            const userSender = await UserModel.get(IDSender);
            
            // Forward tới nhiều conversations
            for (const IDConversation of targetConversations) {
                // Tạo message detail mới với nội dung từ tin nhắn gốc
                const forwardedMessage = {
                    IDMessageDetail: uuidv4(),
                    IDSender: IDSender,
                    IDConversation: IDConversation,
                    type: originalMessage.type,
                    content: originalMessage.content,
                    dateTime: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
                    isForward: true
                };

                // Lưu tin nhắn mới
                const newMessage = await MessageDetailModel.create(forwardedMessage);

                // Cập nhật lastChange và tin nhắn mới nhất của conversation
                const conversation = await Conversation.get(IDConversation);
                if (conversation) {
                    conversation.lastChange = moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS");
                    conversation.idNewestMessage = newMessage.IDMessageDetail;
                    await conversation.save();
                }

                // Gửi tin nhắn tới tất cả người trong conversation
                io.to(IDConversation).emit("receive_message", {
                    ...newMessage,
                    userSender
                });

                results.push({
                    conversationId: IDConversation,
                    messageId: newMessage.IDMessageDetail
                });
            }

            // Thông báo forward thành công về cho người gửi
            socket.emit("forward_message_success", {
                originalMessageId: IDMessageDetail,
                forwardedMessages: results
            });

        } catch (error) {
            console.error("Error forwarding message:", error);
            socket.emit("forward_message_error", {
                message: "Lỗi khi chuyển tiếp tin nhắn",
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
    handleForwardMessage
    // Export thêm các hàm mới nếu cần
};
