// const MessageController = require("./MessageController");
const MessageDetailController = require("./messageDetailController")
const Conversation = require("../models/ConversationModel")
const { v4: uuidv4 } = require("uuid");
const s3 = require("../config/connectS3")
const MessageDetail = require("../models/MessageDetailModel")
const User = require("../models/UserModel")
const MessageBucket = require("../models/MessageBucketModel")
const moment = require("moment-timezone")
const conversationController = require("./conversationController")

let onlineUsers = []

const addNewUser = (id, socketId) => {
  // Kiểm tra xem user đã tồn tại chưa
  const existingUserIndex = onlineUsers.findIndex((user) => user.id === id)

  if (existingUserIndex !== -1) {
    // Nếu user đã tồn tại, cập nhật socketId
    console.log(`Updating socket ID for user ${id} from ${onlineUsers[existingUserIndex].socketId} to ${socketId}`)
    onlineUsers[existingUserIndex].socketId = socketId
  } else {
    // Nếu user chưa tồn tại, thêm mới
    console.log(`Adding new online user: ${id} with socket ${socketId}`)
    onlineUsers.push({ id, socketId })
  }
}

const removeUser = (id) => {
  onlineUsers = onlineUsers.filter((item) => item.id !== id)
}

const getUser = (id) => {
  const user = onlineUsers.find((user) => user.id === id)
  return user
}

const getUserBySocketId = (socketId) => {
  const user = onlineUsers.find((user) => user.socketId === socketId)
  return user
}

const handleUserDisconnect = (socket) => {
  // Sự kiện user ngắt kết nối thông thường
  socket.on("disconnect", () => {
    handleUserOffline(socket)
  })

  // Sự kiện mất kết nối do lỗi mạng
  socket.on("disconnecting", () => {
    handleUserOffline(socket)
  })

  // Sự kiện user chủ động ngắt kết nối
  socket.on("logout", () => {
    handleUserOffline(socket)
  })

  // Sự kiện lỗi kết nối
  socket.on("connect_error", (error) => {
    console.error(`Connection error for socket ${socket.id}:`, error)
    handleUserOffline(socket)
  })
}

const handleUserOffline = (socket) => {
  const user = getUserBySocketId(socket.id)
  console.log(user)
  if (user) {
    removeUser(user.id)
    // Thông báo cho các user khác về việc user này offline
    socket.broadcast.emit("user_offline", {
      userId: user.id,
      timestamp: new Date().toISOString(),
    })
    console.log(`User ${user.id} is offline (socket: ${socket.id})`)
  }
}

// Handler để quản lý user online
const handleUserOnline = (socket) => {
  socket.on("new_user_connect", async (payload) => {
    try {
      const { id } = payload
      console.log(`Received new_user_connect event from user ${id} with socket ${socket.id}`)

      // Thêm hoặc cập nhật user vào danh sách online
      addNewUser(id, socket.id)

      // Join user vào room với ID
      socket.join(id)
      console.log(`User ${id} joined room ${id}`)

      // Thông báo cho các user khác về việc user này online
      socket.broadcast.emit("user_online", {
        userId: id,
        timestamp: new Date().toISOString(),
      })

      // Load unread messages khi user online
      const unreadMessages = await MessageDetail.find({
        idReceiver: id,
        isRead: false,
      })
        .sort({ dateTime: 1 })
        .populate("idSender", "fullname avatar")

      if (unreadMessages.length > 0) {
        console.log(`Sending ${unreadMessages.length} unread messages to user ${id}`)
        socket.emit("unread_messages", {
          messages: unreadMessages,
          count: unreadMessages.length,
        })
      } else {
        console.log(`No unread messages for user ${id}`)
      }

      // Gửi thông báo kết nối thành công
      socket.emit("connection_success", {
        message: "Connected successfully",
        socketId: socket.id,
        userId: id,
      })

      console.log(`User ${id} connected successfully with socket ${socket.id}`)

      // Đăng ký sự kiện disconnect cho socket này
      socket.on("disconnect", () => {
        console.log(`Socket ${socket.id} disconnected, handling user offline`)
        handleUserOffline(socket)
      })
    } catch (error) {
      console.error("Error handling user online:", error)
      socket.emit("connection_error", {
        message: "Failed to connect",
        error: error.message,
      })
    }
  })
}

const handleLoadConversation = (io, socket) => {
  socket.on("load_conversations", async (payload) => {
    try {
      const { IDUser, lastEvaluatedKey } = payload
      const skip = lastEvaluatedKey ? Number.parseInt(lastEvaluatedKey) : 0
      const limit = 10

      // Query conversations
      const conversations = await Conversation.find({
        $or: [{ idSender: IDUser }, { idReceiver: IDUser }],
        isGroup: false,
      })
        .sort({ lastChange: -1 })
        .skip(skip)
        .limit(limit)

      // Lấy thông tin người dùng và tin nhắn mới nhất cho mỗi cuộc trò chuyện
      const conversationsWithDetails = await Promise.all(
        conversations.map(async (conv) => {
          // Xác định ID người nhận
          const otherUserId = conv.idSender === IDUser ? conv.idReceiver : conv.idSender

          // Lấy thông tin người nhận
          const otherUser = await User.findOne({ id: otherUserId }).select("id fullname urlavatar phone status")

          // Lấy tin nhắn mới nhất
          const latestMessage = await MessageDetail.findOne({
            idConversation: conv.idConversation,
          })
            .sort({ dateTime: -1 })
            .limit(1)
            .populate("idSender", "id fullname") // Populate sender info

          const messagePreview = latestMessage
            ? {
                ...latestMessage.toObject(),
                preview:
                  latestMessage.type !== "text"
                    ? `Đã gửi một ${
                        latestMessage.type === "image"
                          ? "hình ảnh"
                          : latestMessage.type === "video"
                            ? "video"
                            : "tệp đính kèm"
                      }`
                    : latestMessage.content,
              }
            : null

          // Đếm số tin nhắn chưa đọc
          const unreadCount = await MessageDetail.countDocuments({
            idConversation: conv.idConversation,
            idReceiver: IDUser,
            isRead: false,
          })
          return {
            ...conv.toObject(),
            otherUser,
            latestMessage: messagePreview,
            unreadCount,
          }
        }),
      )

      // Tính tổng số conversation
      const total = await Conversation.countDocuments({
        $or: [{ idSender: IDUser }, { groupMembers: IDUser }],
      })

      const hasMore = total > skip + limit

      socket.emit("load_conversations_response", {
        Items: conversationsWithDetails,
        LastEvaluatedKey: hasMore ? skip + limit : null,
        total,
      })
    } catch (error) {
      console.error("Error loading conversations:", error)
      socket.emit("error", {
        message: "Lỗi khi tải cuộc trò chuyện",
      })
    }
  })
}

const handleTextMessage = async (IDSender, IDConversation, textMessage) => {
  const message = await MessageDetailController.createTextMessageDetail(IDSender, IDConversation, textMessage)
  return message
}

const updateLastChangeConversation = async (idConversation, idMessage) => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { idConversation: idConversation },
      {
        lastChange: new Date().toISOString(),
        idNewestMessage: idMessage,
      },
      { new: true },
    )
    return conversation
  } catch (error) {
    console.error("Error updating conversation:", error)
    throw error
  }
}

// const uploadFileToS3 = async (file, fileType) => {
//   const bucketMap = {
//     image: "imagetintin",
//     video: "videotintin",
//     document: "documenttintin",
//   };

//   const params = {
//     Bucket: bucketMap[fileType] || "documenttintin",
//     Key: `${uuidv4()}_${file.fileName}`,
//     Body: file.content,
//     ContentType: file.mimeType,
//   };

//   try {
//     const data = await s3.upload(params).promise();
//     return data.Location;
//   } catch (error) {
//     console.error("Error uploading to S3:", error);
//     throw error;
//   }
// };

const handleSendFile = async (io, socket) => {
  socket.on("send_file", async (payload) => {
    try {
      const { idSender, idConversation, file } = payload
      const { type, content, fileName } = file

      // Upload to S3
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${uuidv4()}_${fileName}`,
        Body: content,
        ContentType: type,
      }

      const uploadedFile = await s3.upload(params).promise()

      // Create message
      const newMessage = await MessageDetail.create({
        idMessage: uuidv4(),
        idSender,
        idConversation,
        type: "file",
        content: uploadedFile.Location,
        dateTime: new Date().toISOString(),
      })

      // Get conversation to find receiver
      const conversation = await Conversation.findOne({ idConversation })
      const idReceiver = conversation.idSender === idSender ? conversation.idReceiver : conversation.idSender

      // Emit to conversation room
      io.to(idConversation).emit("receive_message", newMessage)

      // Emit success to sender
      socket.emit("send_message_success", {
        conversationId: idConversation,
        message: newMessage,
      })

      // Emit to specific receiver if online
      const receiverOnline = getUser(idReceiver)
      if (receiverOnline) {
        io.to(receiverOnline.socketId).emit("receive_message", newMessage)
      }

      await updateLastChangeConversation(idConversation, newMessage.idMessage)
    } catch (error) {
      console.error("Error sending file:", error)
      socket.emit("error", {
        message: "Lỗi khi gửi file",
        error: error.message,
      })
    }
  })
}

const handleSendMessage = async (io, socket) => {
  socket.on("send_message", async (payload) => {
    try {
      const { IDSender, IDReceiver, textMessage, type = "text", fileUrl } = payload
      console.log("Received message:", payload)
      let conversation = await Conversation.findOne({
        $or: [
          { idSender: IDSender, idReceiver: IDReceiver },
          { idSender: IDReceiver, idReceiver: IDSender },
        ],
      })

      // Tạo conversation mới nếu chưa có
      if (!conversation) {
        conversation = await Conversation.create({
          idConversation: uuidv4(),
          idSender: IDSender,
          idReceiver: IDReceiver,
          isGroup: false,
          lastChange: new Date().toISOString(),
        })
      }

      // Tạo message detail dựa vào type
      let messageContent = textMessage
      if (type !== "text") {
        messageContent = fileUrl // URL từ S3 sau khi upload
      }

      const messageDetail = await MessageDetail.create({
        idMessage: uuidv4(),
        idSender: IDSender,
        idReceiver: IDReceiver,
        idConversation: conversation.idConversation,
        type: type, // 'text', 'image', 'video', 'audio', 'document'
        content: messageContent,
        dateTime: new Date().toISOString(),
        isRead: false,
      })
      // Phân loại và lưu vào list tương ứng của conversation
      const updateFields = {
        lastChange: new Date().toISOString(),
        idNewestMessage: messageDetail.idMessage,
      }

      // Tự động lưu vào danh sách tương ứng dựa vào type
      if (type === "image") {
        // Lưu vào listImage
        updateFields.$push = { listImage: messageContent }
      } else if (type === "video" || type === "audio") {
        // Lưu vào listVideo (bao gồm cả audio)
        updateFields.$push = { listVideo: messageContent }
      } else if (type === "file" || type === "document") {
        // Lưu vào listFile
        updateFields.$push = { listFile: messageContent }
      }

      // Cập nhật conversation
      const updatedConversation = await Conversation.findOneAndUpdate(
        { idConversation: conversation.idConversation },
        updateFields,
        { new: true },
      )
      // Update last change của conversation
      await updateLastChangeConversation(conversation.idConversation, messageDetail.idMessage)

      // Lấy thông tin sender và receiver
      const [senderUser, receiverUser] = await Promise.all([
        User.findOne({ id: IDSender }).select("id fullname avatar phone status"),
        User.findOne({ id: IDReceiver }).select("id fullname avatar phone status"),
      ])

      const messageWithUsers = {
        ...messageDetail.toObject(),
        senderInfo: senderUser,
        receiverInfo: receiverUser,
      }

      // Emit message cho receiver nếu online
      const receiverOnline = getUser(IDReceiver)
      console.log("Receiver online status:", receiverOnline, "IDReceiver:", IDReceiver, "Online users:", onlineUsers)

      if (receiverOnline) {
        io.to(receiverOnline.socketId).emit("receive_message", messageWithUsers)
        io.to(receiverOnline.socketId).emit("conversation_updated", {
          conversationId: conversation.idConversation,
          updates: {
            listImage: updatedConversation.listImage || [],
            listFile: updatedConversation.listFile || [],
            listVideo: updatedConversation.listVideo || [],
            lastChange: updatedConversation.lastChange,
          },
        })
      }

      // Emit success cho sender
      socket.emit("send_message_success", {
        conversationId: conversation.idConversation,
        message: messageWithUsers,
        conversationUpdates: {
          listImage: updatedConversation.listImage || [],
          listFile: updatedConversation.listFile || [],
          listVideo: updatedConversation.listVideo || [],
          lastChange: updatedConversation.lastChange,
        },
      })
    } catch (error) {
      console.error("Error sending message:", error)
      socket.emit("send_message_error", {
        message: "Lỗi khi gửi tin nhắn",
        error: error.message,
      })
    }
  })
}

const handleDeleteMessage = async (io, socket) => {
  socket.on("delete_message", async (payload) => {
    try {
      const { idMessage, idSender } = payload
      console.log("Received delete_message event with payload:", payload)
      // Tìm và kiểm tra tin nhắn
      const message = await MessageDetail.findOne({ idMessage })
      if (!message) {
        throw new Error("Không tìm thấy tin nhắn")
      }

      // Kiểm tra xem người xóa có phải người gửi không
      if (message.idSender !== idSender) {
        throw new Error("Không có quyền xóa tin nhắn này")
      }

      // Cập nhật trạng thái tin nhắn (chỉ xóa ở phía người gửi)
      const updatedMessage = await MessageDetail.findOneAndUpdate({ idMessage }, { isRemove: true }, { new: true })

      // Gửi thông báo thành công cho người gửi
      socket.emit("delete_message_success", {
        messageId: idMessage,
        updatedMessage,
      })
    } catch (error) {
      console.error("Error deleting message:", error)
      socket.emit("error", {
        message: "Lỗi khi xóa tin nhắn",
        error: error.message,
      })
    }
  })
}
const handleRecallMessage = async (io, socket) => {
  socket.on("recall_message", async (payload) => {
    try {
      const { idMessage, idConversation } = payload

      // Tìm tin nhắn và thông tin người nhận
      const message = await MessageDetail.findOne({ idMessage })
      if (!message) {
        throw new Error("Không tìm thấy tin nhắn")
      }

      // Cập nhật tin nhắn
      const updatedMessage = await MessageDetail.findOneAndUpdate(
        { idMessage },
        {
          isRecall: true,
          content: "Tin nhắn đã được thu hồi",
        },
        { new: true },
      )

      // Tìm conversation để lấy thông tin người nhận
      const conversation = await Conversation.findOne({ idConversation })
      if (!conversation) {
        throw new Error("Không tìm thấy cuộc hội thoại")
      }
      console.log("Conversation của tin nhắn bị thu hồi: ", conversation)

      // Xử lý khác nhau cho nhóm và cuộc trò chuyện 1-1
      if (conversation.isGroup) {
        // Đối với nhóm, gửi thông báo đến tất cả thành viên trong nhóm
        console.log("Sending recall notification to group conversation:", idConversation)

        // Gửi thông báo đến tất cả thành viên trong room của cuộc trò chuyện
        io.to(idConversation).emit("message_recalled", {
          messageId: idMessage,
          updatedMessage: updatedMessage,
          conversationId: idConversation,
        })

        // Nếu có danh sách thành viên nhóm, gửi thông báo trực tiếp đến từng thành viên online
        if (conversation.groupMembers && Array.isArray(conversation.groupMembers)) {
          conversation.groupMembers.forEach((memberId) => {
            if (memberId !== message.idSender) {
              // Không gửi lại cho người gửi
              const memberSocket = getUser(memberId)
              if (memberSocket) {
                io.to(memberSocket.socketId).emit("message_recalled", {
                  messageId: idMessage,
                  updatedMessage: updatedMessage,
                  conversationId: idConversation,
                })
              }
            }
          })
        }
      } else {
        // Đối với cuộc trò chuyện 1-1, xác định người nhận
        const idReceiver = conversation.idSender === message.idSender ? conversation.idReceiver : conversation.idSender

        console.log("Sending recall notification to receiver:", idReceiver)

        // Gửi thông báo cho người nhận
        const receiverSocket = getUser(idReceiver)
        if (receiverSocket) {
          io.to(receiverSocket.socketId).emit("message_recalled", {
            messageId: idMessage,
            updatedMessage: updatedMessage,
            conversationId: idConversation,
          })
        }
      }

      // Gửi thông báo thành công cho người gửi
      socket.emit("recall_message_success", {
        messageId: idMessage,
        success: true,
        conversationId: idConversation,
      })

      console.log("Recall message notification sent")
    } catch (error) {
      console.error("Error recalling message:", error)
      socket.emit("error", {
        message: "Lỗi khi thu hồi tin nhắn",
        error: error.message,
      })
    }
  })
}

const handleForwardMessage = async (io, socket) => {
  socket.on("forward_message", async (payload) => {
    try {
      const { IDMessageDetail, targetConversations, IDSender } = payload
      console.log("Received forward_message event with payload:", payload)
      // Tìm tin nhắn gốc
      const originalMessage = await MessageDetail.findOne({
        idMessage: IDMessageDetail,
      })
      if (!originalMessage) {
        throw new Error("Không tìm thấy tin nhắn gốc")
      }

      const results = []
      const senderInfo = await User.findOne({ id: IDSender }).select("id fullname avatar phone status")

      // Forward tới từng conversation
      for (const IDConversation of targetConversations) {
        // Tìm conversation để lấy receiver
        const conversation = await Conversation.findOne({
          idConversation: IDConversation,
        })
        if (!conversation) continue

        const IDReceiver = conversation.idSender === IDSender ? conversation.idReceiver : conversation.idSender

        // Tạo tin nhắn mới
        const forwardedMessage = await MessageDetail.create({
          idMessage: uuidv4(),
          idSender: IDSender,
          idReceiver: IDReceiver,
          idConversation: IDConversation,
          type: originalMessage.type,
          content: originalMessage.content,
          dateTime: new Date().toISOString(),
          isFoward: true, // Sửa từ isForwarded thành isFoward để match với schema
          originalMessageId: IDMessageDetail,
        })

        // Cập nhật lastChange của conversation
        await updateLastChangeConversation(IDConversation, forwardedMessage.idMessage)

        const messageWithUser = {
          ...forwardedMessage.toObject(),
          senderInfo,
        }

        if (conversation.isGroup) {
          // Nếu là nhóm, gửi tới tất cả thành viên trong nhóm
          conversation.groupMembers.forEach((memberId) => {
            if (memberId !== IDSender) {
              // Không gửi lại cho người gửi
              const memberSocket = getUser(memberId)
              console.log("Member socket ID: ", memberSocket)
              if (memberSocket) {
                io.to(memberSocket.socketId).emit("receive_message", messageWithUser)
              }
            }
          })
        } else {
          // Gửi tin nhắn tới receiver nếu online
          const receiverOnline = getUser(IDReceiver)
          if (receiverOnline) {
            io.to(receiverOnline.socketId).emit("receive_message", messageWithUser)
          }
        }

        io.to(IDConversation).emit("receive_message", messageWithUser)

        results.push({
          conversationId: IDConversation,
          message: messageWithUser,
        })
      }

      // Gửi kết quả về cho sender
      socket.emit("forward_message_success", {
        success: true,
        results,
      })
    } catch (error) {
      console.error("Error forwarding message:", error)
      socket.emit("error", {
        message: "Lỗi khi chuyển tiếp tin nhắn",
        error: error.message,
      })
    }
  })
}

const handleMarkMessageRead = (socket) => {
  socket.on("mark_message_read", async (payload) => {
    try {
      const { messageId } = payload
      await MessageDetail.findOneAndUpdate({ idMessage: messageId }, { isRead: true })
    } catch (error) {
      console.error("Error marking message as read:", error)
    }
  })
}

// Handler để đánh dấu tin nhắn đã đọc khi user click vào conversation hoặc tin nhắn
const handleMarkMessagesRead = (socket) => {
  socket.on("mark_messages_read", async (payload) => {
    try {
      const { conversationId, receiverId } = payload
      // Query để tìm và update tin nhắn chưa đọc
      const result = await MessageDetail.updateMany(
        {
          idConversation: conversationId,
          idReceiver: receiverId,
          isRead: false,
        },
        { isRead: true },
      )

      // Emit kết quả
      socket.emit("messages_marked_read", {
        conversationId,
        receiverId,
        success: true,
        updatedCount: result.modifiedCount,
      })
    } catch (error) {
      console.error("Error marking messages as read:", error)
      socket.emit("error", {
        message: "Lỗi khi đánh dấu tin nhắn đã đọc",
        error: error.message,
      })
    }
  })
}

const handleLoadMessages = (io, socket) => {
  socket.on("load_messages", async (payload) => {
    try {
      const { IDConversation, lastMessageId, firstMessageId, limit = 20 } = payload

      const query = {
        idConversation: IDConversation,
      }

      if (lastMessageId) {
        const lastMessage = await MessageDetail.findOne({
          idMessage: lastMessageId,
        })
        if (lastMessage) {
          query.dateTime = { $lt: lastMessage.dateTime }
        }

      } else if (firstMessageId) {
        const firstMessage = await MessageDetail.findOne({
          idMessage: firstMessageId,
        })
        if (firstMessage) {
          query.dateTime = { $gt: firstMessage.dateTime }
        }
      }

      // Find messages
      const messages = await MessageDetail.find(query)
        .sort({ dateTime: -1 })
        .limit(limit);
      
      // Get all user IDs from messages and reactions
      const userIds = new Set();
      messages.forEach(message => {
        if (message.idSender) userIds.add(message.idSender);
        
        // Add users who reacted to messages
        if (message.reactions) {
          for (const [_, data] of message.reactions.entries()) {
            data.userReactions.forEach(ur => userIds.add(ur.userId));
          }
        }
      });
      
      // Get user information
      const users = await User.find({ id: { $in: Array.from(userIds) } })
        .select("id fullname urlavatar");
      
      // Create user map for easy access
      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = {
          id: user.id,
          fullname: user.fullname,
          urlavatar: user.urlavatar
        };
      });
      
      // Process messages with user info and reactions
      const processedMessages = messages.map(message => {
        const messageObj = message.toObject();
        
        // Add sender info
        messageObj.senderInfo = userMap[message.idSender] || { 
          id: message.idSender, 
          fullname: "Unknown User" 
        };
        
        // Process reactions if they exist
        if (message.reactions && message.reactions.size > 0) {
          const reactionSummary = {};
          
          for (const [key, data] of message.reactions.entries()) {
            if (data.totalCount > 0) {
              reactionSummary[key] = {
                reaction: data.reaction,
                totalCount: data.totalCount,
                userReactions: data.userReactions.map(ur => ({
                  user: userMap[ur.userId] || { id: ur.userId, fullname: "Unknown User" },
                  count: ur.count
                }))
              };
            }
          }
          
          messageObj.reactions = reactionSummary;
        } else {
          messageObj.reactions = {};
        }
        
        return messageObj;
      });
      
      socket.emit("load_messages_response", {
        messages: processedMessages,
        hasMore: messages.length === limit,
        conversationId: IDConversation,
        direction: lastMessageId ? "older" : "newer",
      })
    } catch (error) {
      console.error("Error loading messages:", error)
      socket.emit("error", {
        message: "Lỗi khi tải tin nhắn",
        error: error.message,
      })
    }
  })
}

const getNewestMessages = async (conversations) => {
  try {
    const newestMessages = await Promise.all(
      conversations.map(async (conversation) => {
        // Tìm tin nhắn mới nhất trong conversation
        const newestMessage = await MessageDetail.findOne({
          idConversation: conversation.idConversation,
          // Không lấy tin nhắn đã xóa bởi người gửi
          isDeletedBySender: { $ne: true },
        })
          .sort({ dateTime: -1 })
          .limit(1)

        if (!newestMessage) {
          return {
            conversationId: conversation.idConversation,
            message: null,
          }
        }

        // Lấy thông tin người gửi
        const sender = await User.findOne({
          id: newestMessage.idSender,
        }).select("id fullname avatar phone status")

        // Lấy thông tin người nhận
        const receiver = await User.findOne({
          id: newestMessage.idReceiver,
        }).select("id fullname avatar phone status")

        return {
          conversationId: conversation.idConversation,
          message: {
            ...newestMessage.toObject(),
            dateTime: moment.tz(newestMessage.dateTime, "Asia/Ho_Chi_Minh").format(),
            senderInfo: sender,
            receiverInfo: receiver,
          },
        }
      }),
    )

    return newestMessages
  } catch (error) {
    console.error("Error getting newest messages:", error)
    throw error
  }
}

const handleGetNewestMessages = async (io, socket) => {
  socket.on("get_newest_messages", async (payload) => {
    try {
      const { conversationIds } = payload

      if (!Array.isArray(conversationIds)) {
        throw new Error("conversationIds phải là một mảng")
      }

      // Lấy thông tin các conversation
      const conversations = await Promise.all(conversationIds.map((id) => Conversation.findOne({ idConversation: id })))

      // Lọc bỏ các conversation không tồn tại
      const validConversations = conversations.filter((conv) => conv !== null)

      // Lấy tin nhắn mới nhất cho mỗi conversation
      const newestMessages = await getNewestMessages(validConversations)

      socket.emit("newest_messages_result", {
        success: true,
        messages: newestMessages,
      })
    } catch (error) {
      console.error("Error handling get newest messages:", error)
      socket.emit("error", {
        message: "Lỗi khi lấy tin nhắn mới nhất",
        error: error.message,
      })
    }
  })
}
//{
//   "userIds":["user002"]
// }
const handleCheckUsersStatus = (socket) => {
  socket.on("check_users_status", ({ userIds }) => {
    try {
      const statuses = {}
      userIds.forEach((userId) => {
        const user = getUser(userId)
        statuses[userId] = !!user
      })

      socket.emit("users_status", { statuses })
    } catch (error) {
      console.error("Error checking users status:", error)
      // Thêm emit error để client biết có lỗi
      socket.emit("error", {
        message: "Lỗi khi kiểm tra trạng thái người dùng",
        error: error.message,
      })
    }
  })
}
const handleCreateConversation = async (io, socket) => {
  socket.on("create_conversation", async (payload) => {
    try {
      const { IDSender, IDReceiver } = payload

      // Kiểm tra xem conversation đã tồn tại chưa
      let conversation = await Conversation.findOne({
        $or: [
          { idSender: IDSender, idReceiver: IDReceiver },
          { idSender: IDReceiver, idReceiver: IDSender },
        ],
      })

      // Nếu đã tồn tại, trả về conversation đó
      if (conversation) {
        socket.emit("create_conversation_response", {
          success: true,
          conversation,
          message: "Conversation already exists",
        })
        return
      }

      const user = await User.findOne({ id: IDSender })
      if (!user) {
        socket.emit("create_conversation_response", {
          success: false,
          message: "Người gửi không tồn tại",
        })
        return
      }

      if (user.blockList && user.blockList.includes(IDReceiver)) {
        socket.emit("create_conversation_response", {
          success: false,
          message: "Không thể tạo cuộc trò chuyện với người đã chặn",
        })
        return
      }

      if (user.friendList && !user.friendList.includes(IDReceiver)) {
        socket.emit("create_conversation_response", {
          success: false,
          message: "Không thể tạo cuộc trò chuyện với người chưa kết bạn",
        })
        return
      }

      // Tạo conversation mới
      conversation = await Conversation.create({
        idConversation: uuidv4(),
        idSender: IDSender,
        idReceiver: IDReceiver,
        isGroup: false,
        lastChange: new Date().toISOString(),
      })

      // Lấy thông tin người dùng
      const [senderInfo, receiverInfo] = await Promise.all([
        User.findOne({ id: IDSender }).select("id fullname avatar phone status"),
        User.findOne({ id: IDReceiver }).select("id fullname avatar phone status"),
      ])

      const conversationWithUsers = {
        ...conversation.toObject(),
        senderInfo,
        receiverInfo,
      }

      // Emit cho người tạo
      socket.emit("create_conversation_response", {
        success: true,
        conversation: conversationWithUsers,
        message: "Conversation created successfully",
      })

      // Emit cho người nhận nếu online
      const receiverSocket = getUser(IDReceiver)
      if (receiverSocket) {
        io.to(receiverSocket.socketId).emit("new_conversation", {
          conversation: conversationWithUsers,
        })
      }
    } catch (error) {
      console.error("Error creating conversation:", error)
      socket.emit("create_conversation_response", {
        success: false,
        message: "Lỗi khi tạo cuộc trò chuyện",
        error: error.message,
      })
    }
  })
}

// Khi người dùng join vào một cuộc trò chuyện
const handleJoinConversation = (io, socket) => {
  socket.on("join_conversation", async (payload) => {
    try {
      const { IDUser, IDConversation } = payload

      // Kiểm tra quyền truy cập
      const conversation = await Conversation.findOne({
        idConversation: IDConversation,
        groupMembers: IDUser, // Với nhóm
        // Hoặc $or: [{ idSender: IDUser }, { idReceiver: IDUser }] // Với 1-1
      })

      if (!conversation) {
        socket.emit("join_conversation_response", {
          success: false,
          message: "Không tìm thấy cuộc trò chuyện hoặc bạn không có quyền truy cập",
        })
        return
      }

      // Tham gia room
      socket.join(IDConversation)

      // Thông báo cho các thành viên khác
      socket.to(IDConversation).emit("user_joined_conversation", {
        userId: IDUser,
        conversationId: IDConversation,
        timestamp: new Date(),
      })

      // Trả về kết quả thành công
      socket.emit("join_conversation_response", {
        success: true,
        message: "Đã tham gia cuộc trò chuyện",
        conversationId: IDConversation,
      })
    } catch (error) {
      console.error("Error joining conversation:", error)
      socket.emit("join_conversation_response", {
        success: false,
        message: "Lỗi khi tham gia cuộc trò chuyện",
        error: error.message,
      })
    }
  })
}

// Khi người dùng rời khỏi cuộc trò chuyện (chuyển sang cuộc trò chuyện khác)
const handleLeaveConversation = (io, socket) => {
  socket.on("leave_conversation", async (payload) => {
    try {
      const { IDUser, IDConversation } = payload

      // Rời khỏi room
      socket.leave(IDConversation)

      // Thông báo cho các thành viên khác
      socket.to(IDConversation).emit("user_left_conversation", {
        userId: IDUser,
        conversationId: IDConversation,
        timestamp: new Date(),
      })

      socket.emit("leave_conversation_response", {
        success: true,
        message: "Đã rời khỏi cuộc trò chuyện",
      })
    } catch (error) {
      console.error("Error leaving conversation:", error)
      socket.emit("leave_conversation_response", {
        success: false,
        message: "Lỗi khi rời khỏi cuộc trò chuyện",
        error: error.message,
      })
    }
  })
}

const handleCreatGroupConversation = (io, socket) => {
  socket.on("create_group_conversation", async (payload) => {
    // groupMembers phải có cả IDOwner
    console.log("create_group_conversation payload:>>> ", payload);
    const { IDOwner, groupName, groupMembers, groupAvatarUrl } = payload;
    const groupAvatar = groupAvatarUrl ||null;

    if (groupMembers.length < 2) {
      socket.emit("create_group_conversation_response", {
        success: false,
        message: "Cần thêm ít nhất 2 thành viên để tạo nhóm",
      })
      return
    }

    // kiểm tra groupMembers có nằm trong danh sách bạn của người tạo không
    // Check if all group members are in the owner's friend list
    const owner = await User.findOne({ id: IDOwner })
    if (!owner) {
      socket.emit("create_group_conversation_response", {
        success: false,
        message: "Không tìm thấy thông tin người tạo nhóm",
      })
      return
    }

    // Check if owner has a friendList
    if (!owner.friendList || !Array.isArray(owner.friendList)) {
      socket.emit("create_group_conversation_response", {
        success: false,
        message: "Danh sách bạn bè không hợp lệ",
      })
      return
    }

    // Find members who are not in owner's friend list
    const nonFriendMembers = groupMembers.filter(
      (memberId) => memberId !== IDOwner && !owner.friendList.includes(memberId),
    )

    if (nonFriendMembers.length > 0) {
      socket.emit("create_group_conversation_response", {
        success: false,
        message: "Không thể tạo nhóm với người không nằm trong danh sách bạn bè",
        nonFriendMembers,
      })
      return
    }

    groupMembers.push(IDOwner) // Thêm người tạo vào danh sách thành viên nhóm

    const data = await conversationController.createNewGroupConversation(IDOwner, groupName, groupAvatar, groupMembers)

    const groupMembersInfos = await Promise.all(
      groupMembers.map(async (member) => {
        const userInfo = await User.findOne({ id: member }).select(
          "id fullname urlavatar phone email bio birthday coverPhoto",
        )
        return {
          id: member,
          fullname: userInfo ? userInfo.fullname : "Unknown User",
          urlavatar: userInfo ? userInfo.urlavatar : null,
          phone: userInfo ? userInfo.phone : null,
          email: userInfo ? userInfo.email : null,
          bio: userInfo ? userInfo.bio : null,
          birthday: userInfo ? userInfo.birthday : null,
          coverPhoto: userInfo ? userInfo.coverPhoto : null,
        }
      }),
    )

    // Lấy thông tin người tạo nhóm
    const ownerData = {
      id: IDOwner,
      fullname: owner ? owner.fullname : "Unknown User",
      urlavatar: owner ? owner.urlavatar : null,
      phone: owner ? owner.phone : null,
      email: owner ? owner.email : null,
      bio: owner ? owner.bio : null,
      birthday: owner ? owner.birthday : null,
      coverPhoto: owner ? owner.coverPhoto : null,
    }
    socket.emit("create_group_conversation_response", {
      success: true,
      conversation: data,
      owner: ownerData,
      members: groupMembersInfos,
      message: "Tạo nhóm thành công",
    })

    groupMembers.forEach(async (member) => {
      const user = getUser(member)
      if (user?.socketId) {
        io.to(user.socketId).emit("new_group_conversation", {
          success: true,
          conversation: data,
          owner: ownerData,
          members: groupMembersInfos,
          message: "Group conversation created successfully",
        })
      }
    })
  })
}

// const handleAddMemberToGroup = async (io, socket) => {
//     socket.on("add_member_to_group", async (payload) => {
//         const { IDConversation, IDUser, newGroupMembers } = payload;
//         const conversation = await Conversation.findOne({ idConversation: IDConversation });
//         if (!conversation) {
//             socket.emit("message_from_server", "Cuộc trò chuyện không tồn tại!");
//             return;
//         }

//         const user = User.findOne({ id: IDUser });

//         // Check permission
//         if (
//             !(conversation.rules.IDOwner === IDUser ||
//                 conversation.rules.listIDCoOwner.includes(IDUser))
//         ) {
//             socket.emit(
//                 "message_from_server",
//                 {
//                     success: false,
//                     message: "Chỉ có trưởng nhóm hoặc phó nhóm mới quyền thêm thành viên!",
//                 }
//             );
//             return;
//         }

//         // Kiểm tra xem người dùng đã có trong nhóm chưa
//         const existingMembers = conversation.groupMembers || [];
//         const newMembers = newGroupMembers.filter(member => !existingMembers.includes(member));
//         if (newMembers.length === 0) {
//             socket.emit("message_from_server",
//                 {
//                     success: false,
//                     message: "Người dùng đã có trong nhóm!",
//                 }
//             );
//             return;
//         }

//         // Cập nhật danh sách thành viên
//         conversation.groupMembers.push(...newMembers);

//         const updatedConversation = await conversationController.updateConversation(conversation);
//         await updateLastChangeConversation(IDConversation, updatedConversation.idNewestMessage);

//         const dataNewMembers = await Promise.all(
//             newMembers.map(async (member) => {
//                 const userInfo = await User.findOne({ id: member })
//                     .select('id fullname urlavatar phone status');
//                 return {
//                     id: member,
//                     fullname: userInfo ? userInfo.fullname : 'Unknown User',
//                     urlavatar: userInfo ? userInfo.urlavatar : null,
//                     phone: userInfo ? userInfo.phone : null,
//                     status: userInfo ? userInfo.status : 'offline'
//                 };
//             })
//         );

//         // Gửi thông báo cho các thành viên mới
//         newMembers.forEach(async (member) => {
//             const user = getUser(member);
//             if (user?.socketId) {
//                 io.to(user.socketId).emit(
//                     "new_group_conversation",
//                     {
//                         success: true,
//                         conversation: updatedConversation,
//                         message: "Bạn đã được thêm vào nhóm",
//                         members: dataNewMembers
//                     }
//                 );
//             }
//         });

//         dataNewMembers.forEach(async (member) => {
//             const user = getUser(member.id);
//             if (user?.socketId) {
//                 io.to(user.socketId).emit(
//                     "new_group_conversation",
//                     {
//                         success: true,
//                         conversation: updatedConversation,
//                         message: `${user?.fullname || IDUser} đã được thêm vào nhóm`,
//                     }
//                 );
//             }
//         });
//     });
// };
const handleAddMemberToGroup = async (io, socket) => {
  socket.on("add_member_to_group", async (payload) => {
    const { IDConversation, IDUser, newGroupMembers } = payload
    const conversation = await Conversation.findOne({
      idConversation: IDConversation,
    })
    if (!conversation) {
      socket.emit("message_from_server", {
        success: false,
        message: "Cuộc trò chuyện không tồn tại!",
      })
      return
    }

    // Check permission
    if (!(conversation.rules.IDOwner === IDUser || conversation.rules.listIDCoOwner.includes(IDUser))) {
      socket.emit("message_from_server", {
        success: false,
        message: "Chỉ có trưởng nhóm hoặc phó nhóm mới quyền thêm thành viên!",
      })
      return
    }

    // Kiểm tra xem người dùng đã có trong nhóm chưa
    const existingMembers = conversation.groupMembers || []
    const newMembers = newGroupMembers.filter((member) => !existingMembers.includes(member))
    if (newMembers.length === 0) {
      socket.emit("message_from_server", {
        success: false,
        message: "Người dùng đã có trong nhóm!",
      })
      return
    }

    // Cập nhật danh sách thành viên
    conversation.groupMembers.push(...newMembers)

    const updatedConversation = await conversationController.updateConversation(conversation)

    // Tạo thông báo hệ thống
    const currentUser = await User.findOne({ id: IDUser }).select("fullname")
    const newMembersInfo = await Promise.all(
      newMembers.map(async (memberId) => {
        const userInfo = await User.findOne({ id: memberId }).select("fullname")
        return userInfo ? userInfo.fullname : "Unknown User"
      }),
    )

    const systemMessage = await MessageDetail.create({
      idMessage: uuidv4(),
      idSender: "system",
      idConversation: IDConversation,
      type: "text",
      content: `${currentUser ? currentUser.fullname : IDUser} đã thêm ${newMembersInfo.join(", ")} vào nhóm`,
      dateTime: new Date().toISOString(),
      isRead: false,
    })

    // Cập nhật lastChange và idNewestMessage
    await updateLastChangeConversation(IDConversation, systemMessage.idMessage)
    // Get owner information
    const ownerInfo = await User.findOne({ id: conversation.rules.IDOwner }).select(
      "id fullname urlavatar phone email -_id",
    )

    // Get coOwners information
    const coOwnersInfo = await Promise.all(
      (conversation.rules.listIDCoOwner || []).map(async (coOwnerId) => {
        const userInfo = await User.findOne({ id: coOwnerId }).select("id fullname urlavatar")
        return {
          id: coOwnerId,
          fullname: userInfo ? userInfo.fullname : "Unknown User",
          urlavatar: userInfo ? userInfo.urlavatar : null,
        }
      }),
    )
    const dataNewMembers = await Promise.all(
      newMembers.map(async (member) => {
        const userInfo = await User.findOne({ id: member }).select("id fullname urlavatar phone status")
        return {
          id: member,
          fullname: userInfo ? userInfo.fullname : "Unknown User",
          urlavatar: userInfo ? userInfo.urlavatar : null,
          phone: userInfo ? userInfo.phone : null,
          status: userInfo ? userInfo.status : "offline",
        }
      }),
    )
    ;[...existingMembers, ...newMembers].forEach(async (memberId) => {
      const userSocket = getUser(memberId)
      if (userSocket?.socketId) {
        io.to(userSocket.socketId).emit("receive_message", {
          conversationId: IDConversation,
          message: systemMessage,
        })
      }
    })
    // Gửi thông báo cho các thành viên mới
    newMembers.forEach(async (member) => {
      const allMembersInfo = await Promise.all(
        conversation.groupMembers.map(async (member) => {
          const userInfo = await User.findOne({ id: member }).select("id fullname urlavatar phone status")
          return {
            id: member,
            fullname: userInfo ? userInfo.fullname : "Unknown User",
            urlavatar: userInfo ? userInfo.urlavatar : null,
            phone: userInfo ? userInfo.phone : null,
            status: userInfo ? userInfo.status : "offline",
          }
        }),
      )
      const userSocket = getUser(member)
      if (userSocket?.socketId) {
        io.to(userSocket.socketId).emit("new_group_conversation", {
          success: true,
          conversation: {
            ...updatedConversation.toObject(),
          },
          owner: ownerInfo
            ? {
                id: ownerInfo.id,
                fullname: ownerInfo.fullname,
                urlavatar: ownerInfo.urlavatar,
                phone: ownerInfo.phone,
                email: ownerInfo.email,
              }
            : null,
          coOwners: coOwnersInfo,
          members: allMembersInfo,
          // allMembersInfo: allMembersInfo,
          message: "Bạn đã được thêm vào nhómmm",
          systemMessage,
          // members: dataNewMembers,
        })
      }
    })

    // Gửi thông báo cho các thành viên hiện có (trừ người thêm)
    existingMembers.forEach(async (member) => {
      if (member !== IDUser) {
        // Không gửi cho người thêm thành viên
        const userSocket = getUser(member)
        if (userSocket?.socketId) {
          io.to(userSocket.socketId).emit("new_group_conversation", {
            success: true,
            conversation: updatedConversation,
            message: `${newMembersInfo.join(", ")} đã được thêm vào nhóm`,
            systemMessage,
            members: dataNewMembers,
          })
        }
      }
    })

    // Gửi thông báo cho người thêm thành viên
    socket.emit("message_from_server", {
      success: true,
      message: "Thêm thành viên thành công",
      conversation: updatedConversation,
      systemMessage,
      members: dataNewMembers,
    })
  })
}

const handleRemoveMemberFromGroup = async (io, socket) => {
  socket.on("remove_member_from_group", async (payload) => {
    console.log("remove_member_from_group payload:>>> ", payload)
    try {
      const { IDConversation, IDUser, groupMembers } = payload
      const conversation = await Conversation.findOne({
        idConversation: IDConversation,
      })

      if (!conversation) {
        socket.emit("remove_member_response", {
          success: false,
          message: "Cuộc trò chuyện không tồn tại!",
        })
        return
      }

      // Check permission
      if (!(conversation.rules.IDOwner === IDUser || conversation.rules.listIDCoOwner.includes(IDUser))) {
        socket.emit("remove_member_response", {
          success: false,
          message: "Chỉ có trưởng nhóm hoặc phó nhóm mới quyền xóa thành viên!",
        })
        return
      }

      // Kiểm tra không thể xóa chủ nhóm
      if (groupMembers.includes(conversation.rules.IDOwner)) {
        socket.emit("remove_member_response", {
          success: false,
          message: "Không thể xóa trưởng nhóm khỏi nhóm!",
        })
        return
      }

      // Kiểm tra xem người dùng có trong nhóm không
      const existingMembers = conversation.groupMembers || []
      const membersToRemove = groupMembers.filter((member) => existingMembers.includes(member))

      if (membersToRemove.length === 0) {
        socket.emit("remove_member_response", {
          success: false,
          message: "Những người dùng này không có trong nhóm!",
        })
        return
      }

      // Cập nhật danh sách thành viên và co-owner
      conversation.groupMembers = existingMembers.filter((member) => !membersToRemove.includes(member))

      // Xóa quyền co-owner nếu bị xóa khỏi nhóm
      if (conversation.rules && conversation.rules.listIDCoOwner) {
        conversation.rules.listIDCoOwner = conversation.rules.listIDCoOwner.filter(
          (coOwner) => !membersToRemove.includes(coOwner),
        )
      }

      // Lưu cập nhật vào database
      const updatedConversation = await conversationController.updateConversation(conversation)

      // Tạo thông báo hệ thống
      const user = await User.findOne({ id: IDUser }).select("fullname")

      // Lấy thông tin người bị xóa
      const removedUsers = await Promise.all(
        membersToRemove.map(async (member) => {
          const userInfo = await User.findOne({ id: member }).select("id fullname urlavatar")
          return {
            id: member,
            fullname: userInfo ? userInfo.fullname : "Unknown User",
            urlavatar: userInfo ? userInfo.urlavatar : null,
          }
        }),
      )

      // Tạo nội dung thông báo
      const removedNames = removedUsers.map((user) => user.fullname || user.id).join(", ")

      const systemMessage = await MessageDetail.create({
        idMessage: uuidv4(),
        idSender: "system",
        idConversation: IDConversation,
        type: "system",
        content: `${user?.fullname || IDUser} đã xóa ${removedNames} khỏi nhóm`,
        dateTime: new Date().toISOString(),
        isRead: false,
      })

      // Cập nhật lastChange và idNewestMessage
      await updateLastChangeConversation(IDConversation, systemMessage.idMessage)

      // Thông báo cho người thực hiện xóa
      socket.emit("remove_member_response", {
        success: true,
        message: "Xóa thành viên thành công",
        removedMembers: removedUsers,
        conversation: updatedConversation,
      })

      // Thông báo cho các thành viên bị xóa
      membersToRemove.forEach((member) => {
        const userSocket = getUser(member)
        if (userSocket) {
          io.to(userSocket.socketId).emit("removed_from_group", {
            success: true,
            conversationId: IDConversation,
            removedBy: {
              id: IDUser,
              fullname: user?.fullname || IDUser,
            },
            message: `Bạn đã bị xóa khỏi nhóm ${conversation.groupName}`,
          })
        }
      })

      // Thông báo cho các thành viên còn lại
      conversation.groupMembers.forEach((member) => {
        if (member !== IDUser) {
          const memberSocket = getUser(member)
          if (memberSocket) {
            io.to(memberSocket.socketId).emit("member_removed_notification", {
              success: true,
              conversationId: IDConversation,
              removedMembers: removedUsers,
              removedBy: {
                id: IDUser,
                fullname: user?.fullname || IDUser,
              },
              systemMessage,
              message: `${removedNames} đã bị xóa khỏi nhóm`,
            })
          }
        }
      })
    } catch (error) {
      console.error("Error removing members from group:", error)
      socket.emit("remove_member_response", {
        success: false,
        message: "Lỗi khi xóa thành viên khỏi nhóm",
        error: error.message,
      })
    }
  })
}

const handleDeleteGroup = async (io, socket) => {
  socket.on("delete_group", async (payload) => {
    const { IDConversation, IDUser } = payload
    const conversation = await Conversation.findOne({
      idConversation: IDConversation,
    })
    if (!conversation) {
      socket.emit("message_from_server", {
        success: false,
        message: "Cuộc trò chuyện không tồn tại!",
      })
      return
    }

    // Check permission
    if (conversation.rules.IDOwner !== IDUser) {
      socket.emit("message_from_server", {
        success: false,
        message: "Chỉ có trưởng nhóm mới quyền xóa nhóm!",
      })
      return
    }

    // Xóa nhóm
    const group = await Conversation.findOne({
      idConversation: IDConversation,
      isGroup: true,
    })
    const groupName = group.groupName
    const groupMembers = group.groupMembers || []

    await Conversation.deleteOne({ idConversation: IDConversation })
    socket.emit("message_from_server", {
      success: true,
      message: "Nhóm đã được xóa thành công!",
      conversationId: IDConversation,
    })

    groupMembers.forEach(async (member) => {
      const user = getUser(member)
      if (user?.socketId) {
        io.to(user.socketId).emit("new_group_conversation", {
          success: true,
          message: `Nhóm ${groupName} đã bị xóa`,
          status: "deleted",
          conversationId: IDConversation,
        })
      }
    })
  })
}

// Trigger load lại member của group
const handleLoadMemberOfGroup = async (io, socket) => {
  socket.on("load_member_of_group", (payload) => {
    const { IDConversation } = payload
    io.to(IDConversation).emit("load_member_of_group_server", "Load member group again")
  })
}

const handleChangeOwnerGroup = async (io, socket) => {
  socket.on("change_owner_group", async (payload) => {
    const { IDConversation, IDUser, IDNewOwner } = payload
    const conversation = await Conversation.findOne({ idConversation: IDConversation })

    if (!conversation) {
      socket.emit("message_from_server", {
        success: false,
        message: "Cuộc trò chuyện không tồn tại!",
      })
      return
    }

    // Check permission
    if (!(conversation.rules.IDOwner === IDUser)) {
      socket.emit("message_from_server", {
        success: false,
        message: "Chỉ có trưởng nhóm mới quyền thay đổi chủ nhóm!",
      })
      return
    }

    // Kiểm tra xem người mới có trong danh sách thành viên không
    if (!conversation.groupMembers.includes(IDNewOwner)) {
      socket.emit("message_from_server", {
        success: false,
        message: "Người này không có trong danh sách thành viên nhóm!",
      })
      return
    }

    // Cập nhật chủ nhóm mới
    conversation.rules.IDOwner = IDNewOwner
    conversation.idSender = IDNewOwner
    conversation.groupMembers = [IDNewOwner, ...conversation.groupMembers.filter((member) => member !== IDNewOwner)] // Đưa chủ nhóm mới lên đầu danh sách thành viên

    if (conversation.rules.listIDCoOwner) {
      conversation.rules.listIDCoOwner = conversation.rules.listIDCoOwner.filter((coOwner) => coOwner !== IDNewOwner)
    }

    const updatedConversation = await conversationController.updateConversation(conversation)

    await updateLastChangeConversation(IDConversation, updatedConversation.idNewestMessage)

    const user = await User.findOne({ id: IDUser }).select("fullname")
    const newOwner = await User.findOne({ id: IDNewOwner }).select("id fullname urlavatar phone email")
    const oldOwner = await User.findOne({ id: IDUser }).select("fullname")

    // Create formatted owner object with complete information
    const newOwnerInfo = {
      id: newOwner.id,
      fullname: newOwner.fullname,
      urlavatar: newOwner.urlavatar || "",
      phone: newOwner.phone || "",
      email: newOwner.email || "",
    }
    const systemMessage = await MessageDetail.create({
      idMessage: uuidv4(),
      idSender: "system",
      idConversation: IDConversation,
      type: "system",
      content: `${oldOwner?.fullname || IDUser} đã chuyển quyền chủ nhóm cho ${newOwner?.fullname || IDNewOwner}`,
      dateTime: new Date().toISOString(),
      isRead: false,
    })
    // Cập nhật lastChange và idNewestMessage
    await updateLastChangeConversation(IDConversation, systemMessage.idMessage)

    // Thông báo cho người thực hiện thay đổi
    socket.emit("message_from_server", {
      success: true,
      message: "Thay đổi chủ nhóm thành công",
      conversation: updatedConversation,
      status: "changedOwner",
      systemMessage: systemMessage,
      newOwner: newOwnerInfo,
    })

    // Thông báo cho người mới
    const newOwnerSocket = getUser(IDNewOwner)
    if (newOwnerSocket) {
      io.to(newOwnerSocket.socketId).emit("new_group_owner_noti", {
        success: true,
        conversation: updatedConversation,
        message: `Bạn đã trở thành chủ nhóm ${conversation.groupName}`,
        systemMessage: systemMessage,
        newOwner: newOwnerInfo,
      })
    }

    // Thông báo cho các thành viên còn lại
    conversation.groupMembers.forEach((member) => {
      if (member !== IDUser) {
        const userSocket = getUser(member)
        if (userSocket) {
          io.to(userSocket.socketId).emit("member_removed_notification", {
            success: true,
            conversationId: IDConversation,
            systemMessage,
            newOwner: newOwnerInfo,
            oldOwner: {
              id: IDUser,
              fullname: oldOwner?.fullname || IDUser,
            },
            message: `${oldOwner?.fullname || IDUser} đã chuyển quyền chủ nhóm cho ${newOwner?.fullname || IDNewOwner}`,
          })
        }
      }
    })
    // Thông báo cho các thành viên còn lại với emit group_owner_changed_notification
    conversation.groupMembers.forEach((member) => {
      if (member !== IDUser && member !== IDNewOwner) {
        const userSocket = getUser(member)
        if (userSocket) {
          io.to(userSocket.socketId).emit("group_owner_changed_notification", {
            success: true,
            conversationId: IDConversation,
            systemMessage,
            newOwner: newOwnerInfo,
            oldOwner: {
              id: IDUser,
              fullname: oldOwner?.fullname || IDUser,
            },
            message: `${oldOwner?.fullname || IDUser} đã chuyển quyền chủ nhóm cho ${newOwner?.fullname || IDNewOwner}`,
          })
        }
      }
    })
  })
}

const handleSendGroupMessage = (io, socket) => {
  socket.on("send_group_message", async (payload) => {
    try {
      const { IDSender, IDConversation, textMessage, type = "text", fileUrl } = payload

      // Tìm conversation dựa trên idConversation vì nó là unique
      const conversation = await Conversation.findOne({
        idConversation: IDConversation,
      })

      if (!conversation) {
        throw new Error("Không tìm thấy cuộc trò chuyện")
      }

      // Kiểm tra xem đây có phải là nhóm không
      if (!conversation.isGroup) {
        throw new Error("Cuộc trò chuyện này không phải là nhóm")
      }

      // Kiểm tra xem người gửi có trong danh sách thành viên không
      if (!conversation.groupMembers.includes(IDSender)) {
        throw new Error("Bạn không phải là thành viên của nhóm này")
      }

      // Tạo message detail dựa vào type
      let messageContent = textMessage
      if (type !== "text") {
        messageContent = fileUrl // URL từ S3 sau khi upload
      }

      const messageDetail = await MessageDetail.create({
        idMessage: uuidv4(),
        idSender: IDSender,
        idConversation: IDConversation,
        type: type, // 'text', 'image', 'video', 'audio', 'document'
        content: messageContent,
        dateTime: new Date().toISOString(),
        isRead: false,
      })
      const updateFields = {
        lastChange: new Date().toISOString(),
        idNewestMessage: messageDetail.idMessage,
      }

      // Tự động lưu vào danh sách tương ứng dựa vào type
      if (type === "image") {
        // Lưu vào listImage
        updateFields.$push = { listImage: messageContent }
      } else if (type === "video" || type === "audio") {
        // Lưu vào listVideo (bao gồm cả audio)
        updateFields.$push = { listVideo: messageContent }
      } else if (type === "file" || type === "document") {
        // Lưu vào listFile
        updateFields.$push = { listFile: messageContent }
      }
      const updatedConversation = await Conversation.findOneAndUpdate(
        { idConversation: IDConversation },
        updateFields,
        { new: true },
      )
      // Update last change của conversation
      await Conversation.updateOne(
        { idConversation: IDConversation },
        {
          lastChange: new Date().toISOString(),
          idNewestMessage: messageDetail.idMessage,
        },
      )

      // Lấy thông tin sender
      const senderUser = await User.findOne({ id: IDSender }).select("id fullname urlavatar phone status")

      const messageWithUsers = {
        ...messageDetail.toObject(),
        senderInfo: senderUser,
      }

      // Emit message cho các thành viên khác trong nhóm
      const groupMembers = conversation.groupMembers.filter((member) => member !== IDSender)

      groupMembers.forEach((member) => {
        const receiverOnline = getUser(member)
        if (receiverOnline) {
          io.to(receiverOnline.socketId).emit("receive_message", messageWithUsers)

          // Send updated conversation to group members
          io.to(receiverOnline.socketId).emit("conversation_updated", {
            conversationId: IDConversation,
            updates: {
              listImage: updatedConversation.listImage || [],
              listFile: updatedConversation.listFile || [],
              listVideo: updatedConversation.listVideo || [],
              lastChange: updatedConversation.lastChange,
            },
          })
        }
      })

      // Nếu conversation có một room socket, emit đến room đó
      if (conversation.roomId) {
        socket.to(conversation.roomId).emit("receive_message", messageWithUsers)
      }

      // Emit success cho sender
      socket.emit("send_message_success", {
        conversationId: IDConversation,
        message: messageWithUsers,
        conversationUpdates: {
          listImage: updatedConversation.listImage || [],
          listFile: updatedConversation.listFile || [],
          listVideo: updatedConversation.listVideo || [],
          lastChange: updatedConversation.lastChange,
        },
      })
    } catch (error) {
      console.error("Error sending group message:", error)
      socket.emit("send_message_error", {
        message: "Lỗi khi gửi tin nhắn nhóm",
        error: error.message,
      })
    }
  })
}

// Thêm vào socketController.js
// const handleUpdateGroupInfo = (io, socket) => {
//     socket.on("update_group_info", async (payload) => {
//         try {
//             const { IDConversation, IDUser, groupName, groupAvatar } = payload;

//             // Kiểm tra quyền người dùng
//             const conversation = await Conversation.findOne({
//                 idConversation: IDConversation,
//                 isGroup: true
//             });

//             if (!conversation) {
//                 socket.emit("update_group_info_response", {
//                     success: false,
//                     message: "Không tìm thấy nhóm chat"
//                 });
//                 return;
//             }

//             // Chỉ trưởng nhóm và phó nhóm mới có quyền cập nhật
//             const isOwner = conversation.rules.IDOwner === IDUser;
//             const isCoOwner = conversation.rules.listIDCoOwner.includes(IDUser);

//             if (!isOwner && !isCoOwner) {
//                 socket.emit("update_group_info_response", {
//                     success: false,
//                     message: "Bạn không có quyền cập nhật thông tin nhóm"
//                 });
//                 return;
//             }

//             // Xử lý upload avatar mới nếu có
//             let avatarUrl = conversation.groupAvatar;
//             if (groupAvatar && groupAvatar.startsWith('data:')) {
//                 // Xử lý base64 image
//                 const base64Data = groupAvatar.replace(/^data:image\/\w+;base64,/, '');
//                 const buffer = Buffer.from(base64Data, 'base64');

//                 // Upload lên S3
//                 const params = {
//                     Bucket: process.env.AWS_BUCKET_NAME,
//                     Key: `group-avatars/${uuidv4()}.jpg`,
//                     Body: buffer,
//                     ContentType: 'image/jpeg'
//                 };

//                 const uploadResult = await s3.upload(params).promise();
//                 avatarUrl = uploadResult.Location;
//             }

//             // Tạo object chứa các update
//             const updates = {};
//             if (groupName && groupName.trim() !== '') {
//                 updates.groupName = groupName.trim();
//             }
//             if (avatarUrl && avatarUrl !== conversation.groupAvatar) {
//                 updates.groupAvatar = avatarUrl;
//             }

//             if (Object.keys(updates).length === 0) {
//                 socket.emit("update_group_info_response", {
//                     success: false,
//                     message: "Không có thông tin nào được cập nhật"
//                 });
//                 return;
//             }

//             // Thêm lastChange vào updates
//             updates.lastChange = moment.tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm:ss.SSS');

//             // Cập nhật thông tin nhóm
//             await Conversation.updateMany(
//                 { idConversation: IDConversation },
//                 { $set: updates }
//             );

//             // Tạo thông báo hệ thống
//             const user = await User.findOne({ id: IDUser }).select('fullname');
//             const changes = [];

//             if (updates.groupName) {
//                 changes.push(`tên nhóm thành "${updates.groupName}"`);
//             }
//             if (updates.groupAvatar && updates.groupAvatar !== conversation.groupAvatar) {
//                 changes.push("ảnh đại diện nhóm");
//             }

//             const systemMessage = await MessageDetail.create({
//                 idMessage: uuidv4(),
//                 idSender: "system",
//                 idConversation: IDConversation,
//                 type: "system",
//                 content: `${user.fullname || IDUser} đã cập nhật ${changes.join(" và ")}`,
//                 dateTime: new Date().toISOString(),
//                 isRead: false
//             });

//             // Cập nhật lastChange và idNewestMessage
//             await updateLastChangeConversation(
//                 IDConversation,
//                 systemMessage.idMessage
//             );

//             // Thông báo cho người cập nhật
//             socket.emit("update_group_info_response", {
//                 success: true,
//                 message: "Cập nhật thông tin nhóm thành công",
//                 updates: {
//                     ...updates,
//                     lastChange: undefined // Không cần trả về lastChange
//                 }
//             });

//             // Thông báo cho tất cả thành viên trong nhóm
//             conversation.groupMembers.forEach(member => {
//                 if (member !== IDUser) {
//                     const memberSocket = getUser(member);
//                     if (memberSocket) {
//                         io.to(memberSocket.socketId).emit("group_info_updated", {
//                             conversationId: IDConversation,
//                             updates: {
//                                 ...updates,
//                                 lastChange: undefined
//                             },
//                             message: systemMessage
//                         });
//                     }
//                 }
//             });

//         } catch (error) {
//             console.error("Error updating group info:", error);
//             socket.emit("update_group_info_response", {
//                 success: false,
//                 message: "Lỗi khi cập nhật thông tin nhóm",
//                 error: error.message
//             });
//         }
//     });
// };
const handleUpdateGroupInfo = (io, socket) => {
  socket.on("update_group_info", async (payload) => {
    try {
      const { IDConversation, IDUser, groupName, groupAvatarUrl } = payload

      // Kiểm tra quyền người dùng
      const conversation = await Conversation.findOne({
        idConversation: IDConversation,
        isGroup: true,
      })

      if (!conversation) {
        socket.emit("update_group_info_response", {
          success: false,
          message: "Không tìm thấy nhóm chat",
        })
        return
      }

      // Chỉ trưởng nhóm và phó nhóm mới có quyền cập nhật
      const isOwner = conversation.rules.IDOwner === IDUser
      const isCoOwner = conversation.rules.listIDCoOwner.includes(IDUser)

      if (!isOwner && !isCoOwner) {
        socket.emit("update_group_info_response", {
          success: false,
          message: "Bạn không có quyền cập nhật thông tin nhóm",
        })
        return
      }

      // Tạo object chứa các update
      const updates = {}
      if (groupName && groupName.trim() !== "") {
        updates.groupName = groupName.trim()
      }
      if (groupAvatarUrl && groupAvatarUrl !== conversation.groupAvatar) {
        updates.groupAvatar = groupAvatarUrl
      }

      if (Object.keys(updates).length === 0) {
        socket.emit("update_group_info_response", {
          success: false,
          message: "Không có thông tin nào được cập nhật",
        })
        return
      }

      // Thêm lastChange vào updates
      updates.lastChange = moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS")

      // Cập nhật thông tin nhóm
      await Conversation.updateMany({ idConversation: IDConversation }, { $set: updates })

      // Tạo thông báo hệ thống
      const user = await User.findOne({ id: IDUser }).select("fullname")
      const changes = []

      if (updates.groupName) {
        changes.push(`tên nhóm thành "${updates.groupName}"`)
      }
      if (updates.groupAvatar && updates.groupAvatar !== conversation.groupAvatar) {
        changes.push("ảnh đại diện nhóm")
      }

      const systemMessage = await MessageDetail.create({
        idMessage: uuidv4(),
        idSender: "system",
        idConversation: IDConversation,
        type: "system",
        content: `${user.fullname || IDUser} đã cập nhật ${changes.join(" và ")}`,
        dateTime: new Date().toISOString(),
        isRead: false,
      })

      // Cập nhật lastChange và idNewestMessage
      await updateLastChangeConversation(IDConversation, systemMessage.idMessage)

      // Thông báo cho người cập nhật
      socket.emit("update_group_info_response", {
        success: true,
        message: "Cập nhật thông tin nhóm thành công",
        updates: {
          ...updates,
          lastChange: undefined, // Không cần trả về lastChange
        },
        systemMessage,
        conversationId: IDConversation,
      })

      // Thông báo cho tất cả thành viên trong nhóm
      conversation.groupMembers.forEach((member) => {
        if (member !== IDUser) {
          const memberSocket = getUser(member)
          if (memberSocket) {
            io.to(memberSocket.socketId).emit("group_info_updated", {
              conversationId: IDConversation,
              updates: {
                ...updates,
                lastChange: undefined,
              },
              systemMessage,
              message: systemMessage,
            })
          }
        }
      })
    } catch (error) {
      console.error("Error updating group info:", error)
      socket.emit("update_group_info_response", {
        success: false,
        message: "Lỗi khi cập nhật thông tin nhóm",
        error: error.message,
      })
    }
  })
}

// Thêm vào socketController.js
const handlePromoteMemberToAdmin = (io, socket) => {
  socket.on("promote_member_to_admin", async (payload) => {
    try {
      const { IDConversation, IDUser, IDMemberToPromote } = payload

      // Kiểm tra conversation có tồn tại không
      const conversation = await Conversation.findOne({
        idConversation: IDConversation,
        isGroup: true,
      })

      if (!conversation) {
        socket.emit("promote_member_response", {
          success: false,
          message: "Không tìm thấy nhóm chat",
        })
        return
      }

      // Kiểm tra quyền của người thực hiện
      if (conversation.rules.IDOwner !== IDUser) {
        socket.emit("promote_member_response", {
          success: false,
          message: "Chỉ trưởng nhóm mới có thể thăng cấp thành viên",
        })
        return
      }

      // Kiểm tra người được thăng cấp có trong nhóm không
      if (!conversation.groupMembers.includes(IDMemberToPromote)) {
        socket.emit("promote_member_response", {
          success: false,
          message: "Người dùng không phải thành viên của nhóm",
        })
        return
      }

      // Kiểm tra người dùng đã là quản trị viên chưa
      if (conversation.rules.listIDCoOwner.includes(IDMemberToPromote)) {
        socket.emit("promote_member_response", {
          success: false,
          message: "Thành viên này đã là quản trị viên",
        })
        return
      }

      // Thực hiện thăng cấp thành quản trị viên
      await Conversation.updateMany(
        { idConversation: IDConversation },
        {
          $addToSet: { "rules.listIDCoOwner": IDMemberToPromote },
          lastChange: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
        },
      )
      // Get updated conversation with new co-owner list
      const updatedConversation = await Conversation.findOne({
        idConversation: IDConversation,
      })

      // Lấy thông tin người dùng
      const [promoter, promoted] = await Promise.all([
        User.findOne({ id: IDUser }).select("fullname"),
        User.findOne({ id: IDMemberToPromote }).select("id fullname urlavatar phone email"),
      ])
      const promotedMemberInfo = {
        id: promoted.id,
        fullname: promoted.fullname,
        urlavatar: promoted.urlavatar || "",
        phone: promoted.phone || "",
        email: promoted.email || "",
      }
      // Tạo thông báo hệ thống
      const systemMessage = await MessageDetail.create({
        idMessage: uuidv4(),
        idSender: "system",
        idConversation: IDConversation,
        type: "system",
        content: `${promoter.fullname || IDUser} đã thăng cấp ${
          promoted.fullname || IDMemberToPromote
        } làm quản trị viên`,
        dateTime: new Date().toISOString(),
        isRead: false,
      })

      // Cập nhật lastChange của conversation
      await updateLastChangeConversation(IDConversation, systemMessage.idMessage)

      // Thông báo cho người thăng cấp
      socket.emit("promote_member_response", {
        success: true,
        message: "Thăng cấp thành viên thành quản trị viên thành công",
        conversationId: IDConversation,
        memberId: IDMemberToPromote,
        promotedMember: promotedMemberInfo,
        systemMessage: systemMessage,
        updatedRules: updatedConversation.rules,
      })

      // Thông báo cho người được thăng cấp
      const memberSocket = getUser(IDMemberToPromote)
      if (memberSocket) {
        io.to(memberSocket.socketId).emit("member_promoted", {
          conversationId: IDConversation,
          promotedBy: IDUser,
          message: "Bạn đã được thăng cấp làm quản trị viên nhóm",
          systemMessage: systemMessage,
          updatedRules: updatedConversation.rules,
        })
      }

      // Thông báo cho các thành viên khác
      // conversation.groupMembers.forEach((member) => {
      //   if (member !== IDUser && member !== IDMemberToPromote) {
      //     const userSocket = getUser(member);
      //     if (userSocket) {
      //       io.to(userSocket.socketId).emit("member_promoted_notification", {
      //         conversationId: IDConversation,
      //         promotedMember: IDMemberToPromote,
      //         promotedBy: IDUser,
      //         systemMessage,
      //       });
      //     }
      //   }
      // });
      conversation.groupMembers.forEach((member) => {
        const userSocket = getUser(member)
        if (userSocket?.socketId) {
          io.to(userSocket.socketId).emit("member_promoted_notification", {
            conversationId: IDConversation,
            promotedMember: IDMemberToPromote,
            promotedBy: IDUser,
            systemMessage,
            updatedRules: updatedConversation.rules,
          })
        }
      })
    } catch (error) {
      console.error("Error promoting member:", error)
      socket.emit("promote_member_response", {
        success: false,
        message: "Lỗi khi thăng cấp thành viên",
        error: error.message,
      })
    }
  })
}

// Thêm vào socketController.js
const handleDemoteMember = (io, socket) => {
  socket.on("demote_member", async (payload) => {
    try {
      const { IDConversation, IDUser, IDMemberToDemote } = payload

      // Kiểm tra conversation có tồn tại không
      const conversation = await Conversation.findOne({
        idConversation: IDConversation,
        isGroup: true,
      })

      if (!conversation) {
        socket.emit("demote_member_response", {
          success: false,
          message: "Không tìm thấy nhóm chat",
        })
        return
      }

      // Kiểm tra quyền của người thực hiện
      if (conversation.rules.IDOwner !== IDUser) {
        socket.emit("demote_member_response", {
          success: false,
          message: "Chỉ trưởng nhóm mới có thể giáng cấp quản trị viên",
        })
        return
      }

      // Kiểm tra người được giáng cấp có là quản trị viên không
      if (!conversation.rules.listIDCoOwner.includes(IDMemberToDemote)) {
        socket.emit("demote_member_response", {
          success: false,
          message: "Thành viên này không phải là quản trị viên",
        })
        return
      }

      // Thực hiện giáng cấp
      await Conversation.updateMany(
        { idConversation: IDConversation },
        {
          $pull: { "rules.listIDCoOwner": IDMemberToDemote },
          lastChange: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
        },
      )
      const updatedConversation = await Conversation.findOne({
        idConversation: IDConversation,
      })

      // Lấy thông tin người dùng
      const [demoter, demoted] = await Promise.all([
        User.findOne({ id: IDUser }).select("fullname"),
        User.findOne({ id: IDMemberToDemote }).select("fullname"),
      ])
      const demotedMemberInfo = {
        id: demoted.id,
        fullname: demoted.fullname,
        urlavatar: demoted.urlavatar || "",
      }
      // Tạo thông báo hệ thống
      const systemMessage = await MessageDetail.create({
        idMessage: uuidv4(),
        idSender: "system",
        idConversation: IDConversation,
        type: "system",
        content: `${demoter.fullname || IDUser} đã thu hồi quyền quản trị viên của ${
          demoted.fullname || IDMemberToDemote
        }`,
        dateTime: new Date().toISOString(),
        isRead: false,
      })

      // Cập nhật lastChange của conversation
      await updateLastChangeConversation(IDConversation, systemMessage.idMessage)

      // Thông báo cho người giáng cấp
      socket.emit("demote_member_response", {
        conversationId: IDConversation,
        success: true,
        message: "Thu hồi quyền quản trị viên thành công",
        memberId: IDMemberToDemote,
        systemMessage: systemMessage,
        updatedRules: updatedConversation.rules,
        demotedMember: demotedMemberInfo,
      })

      // Thông báo cho người bị giáng cấp
      const memberSocket = getUser(IDMemberToDemote)
      if (memberSocket) {
        io.to(memberSocket.socketId).emit("member_demoted", {
          conversationId: IDConversation,
          demotedBy: IDUser,
          message: "Bạn đã bị thu hồi quyền quản trị viên nhóm",
          systemMessage: systemMessage,
          updatedRules: updatedConversation.rules,
        })
      }

      // Thông báo cho các thành viên khác
      // conversation.groupMembers.forEach((member) => {
      //   if (member !== IDUser && member !== IDMemberToDemote) {
      //     const userSocket = getUser(member);
      //     if (userSocket) {
      //       io.to(userSocket.socketId).emit("member_demoted_notification", {
      //         conversationId: IDConversation,
      //         demotedMember: IDMemberToDemote,
      //         demotedBy: IDUser,
      //         systemMessage,
      //       });
      //     }
      //   }
      // });
      conversation.groupMembers.forEach((member) => {
        const userSocket = getUser(member)
        if (userSocket) {
          io.to(userSocket.socketId).emit("member_demoted_notification", {
            conversationId: IDConversation,
            demotedMember: IDMemberToDemote,
            demotedBy: IDUser,
            systemMessage,
            updatedRules: updatedConversation.rules,
            demotedMemberInfo: demotedMemberInfo,
          })
        }
      })
    } catch (error) {
      console.error("Error demoting member:", error)
      socket.emit("demote_member_response", {
        success: false,
        message: "Lỗi khi thu hồi quyền quản trị viên",
        error: error.message,
      })
    }
  })
}

// Thêm vào socketController.js
const handleSearchMessagesInGroup = (io, socket) => {
  socket.on("search_messages_in_group", async (payload) => {
    try {
      const { IDConversation, IDUser, searchText, limit = 20, skip = 0 } = payload

      // Kiểm tra conversation có tồn tại không
      const conversation = await Conversation.findOne({
        idConversation: IDConversation,
        isGroup: true,
        groupMembers: IDUser, // Đảm bảo người dùng là thành viên của nhóm
      })

      if (!conversation) {
        socket.emit("search_messages_response", {
          success: false,
          message: "Không tìm thấy nhóm chat hoặc bạn không phải thành viên nhóm",
        })
        return
      }

      // Tạo pattern tìm kiếm
      const searchPattern = new RegExp(searchText, "i")

      // Tìm kiếm tin nhắn
      const messages = await MessageDetail.find({
        idConversation: IDConversation,
        content: searchPattern,
        type: "text", // Chỉ tìm kiếm tin nhắn văn bản
      })
        .sort({ dateTime: -1 })
        .skip(skip)
        .limit(limit)

      // Đếm tổng số kết quả
      const total = await MessageDetail.countDocuments({
        idConversation: IDConversation,
        content: searchPattern,
        type: "text",
      })

      // Lấy thông tin người gửi
      const senderIds = [...new Set(messages.map((msg) => msg.idSender))]
      const senders = await User.find({ id: { $in: senderIds } }).select("id fullname urlavatar")

      const senderMap = senders.reduce((map, sender) => {
        map[sender.id] = sender
        return map
      }, {})

      // Format kết quả
      const formattedMessages = messages.map((msg) => ({
        ...msg.toObject(),
        senderInfo: senderMap[msg.idSender] || {
          id: msg.idSender,
          fullname: "Unknown",
        },
        dateTime: moment.tz(msg.dateTime, "Asia/Ho_Chi_Minh").format(),
      }))

      // Trả kết quả
      socket.emit("search_messages_response", {
        success: true,
        messages: formattedMessages,
        total,
        hasMore: total > skip + limit,
        searchText,
      })
    } catch (error) {
      console.error("Error searching messages:", error)
      socket.emit("search_messages_response", {
        success: false,
        message: "Lỗi khi tìm kiếm tin nhắn",
        error: error.message,
      })
    }
  })
}

const handleReplyMessage = async (io, socket) => {
  socket.on("reply_message", async (payload) => {
    try {
      const { 
        IDSender, 
        IDReceiver, 
        IDConversation, 
        IDMessageReply, 
        textMessage, 
        type = "text", 
        fileUrl 
      } = payload;
      
      console.log("Received reply message:", payload);
      
      // Tìm tin nhắn gốc để reply
      const originalMessage = await MessageDetail.findOne({ idMessage: IDMessageReply });
      if (!originalMessage) {
        throw new Error("Không tìm thấy tin nhắn gốc");
      }
      
      // Tìm conversation
      let conversation = await Conversation.findOne({ idConversation: IDConversation });
      
      // Tạo message detail dựa vào type
      let messageContent = textMessage;
      if (type !== "text") {
        messageContent = fileUrl;
      }
      
      // Tạo tin nhắn reply
      const messageDetail = await MessageDetail.create({
        idMessage: uuidv4(),
        idSender: IDSender,
        idReceiver: IDReceiver,
        idConversation: IDConversation,
        type: type,
        content: messageContent,
        dateTime: new Date().toISOString(),
        isRead: false,
        isReply: true,
        messageReply: {
          idMessage: IDMessageReply,
          content: originalMessage.content,
          idSender: originalMessage.idSender,
          dateTime: originalMessage.dateTime,
          type: originalMessage.type,
          senderInfo: {
            id: originalMessage.idSender,
            fullname: (await User.findOne({ id: originalMessage.idSender }).select("fullname")).fullname || "Unknown",
            urlavatar: (await User.findOne({ id: originalMessage.idSender }).select("urlavatar")).urlavatar || ""
          }
        }
      });
      
      // Cập nhật conversation
      const updateFields = {
        lastChange: new Date().toISOString(),
        idNewestMessage: messageDetail.idMessage,
      };
      
      // Tự động lưu vào danh sách tương ứng dựa vào type
      if (type === "image") {
        updateFields.$push = { listImage: messageContent };
      } else if (type === "video" || type === "audio") {
        // Lưu vào listVideo (bao gồm cả audio)
        updateFields.$push = { listVideo: messageContent };
      } else if (type === "file" || type === "document") {
        updateFields.$push = { listFile: messageContent };
      }
      
      const updatedConversation = await Conversation.findOneAndUpdate(
        { idConversation: IDConversation },
        updateFields,
        { new: true }
      );
      
      await updateLastChangeConversation(IDConversation, messageDetail.idMessage);
      
      // Lấy thông tin người gửi
      const sender = await User.findOne({ id: IDSender }).select("id fullname urlavatar");
      
      // Thêm thông tin người gửi và tin nhắn gốc vào tin nhắn
      const messageWithUsers = {
...messageDetail.toObject(),
        senderInfo: sender,
        originalMessage: originalMessage
      };
      
      // Xử lý gửi tin nhắn dựa vào loại conversation (nhóm hoặc đơn)
      if (conversation.isGroup) {
        // Nếu là nhóm, gửi tới tất cả thành viên trong nhóm
        const groupMembers = conversation.groupMembers || [];
        
        groupMembers.forEach((member) => {
          if (member !== IDSender) {
            const receiverOnline = getUser(member);
            if (receiverOnline) {
              io.to(receiverOnline.socketId).emit("receive_message", messageWithUsers);
              io.to(receiverOnline.socketId).emit("conversation_updated", {
                conversationId: IDConversation,
                updates: {
                  listImage: updatedConversation.listImage || [],
                  listFile: updatedConversation.listFile || [],
                  listVideo: updatedConversation.listVideo || [],
                  lastChange: updatedConversation.lastChange
                }
              });
            }
          }
        });
      } else {
        // Nếu là chat đơn, gửi tới người nhận
        const receiverOnline = getUser(IDReceiver);
        if (receiverOnline) {
          io.to(receiverOnline.socketId).emit("receive_message", messageWithUsers);
          io.to(receiverOnline.socketId).emit("conversation_updated", {
            conversationId: IDConversation,
            updates: {
              listImage: updatedConversation.listImage || [],
              listFile: updatedConversation.listFile || [],
              listVideo: updatedConversation.listVideo || [],
              lastChange: updatedConversation.lastChange
            }
          });
        }
      }
      
      // Emit success cho sender
      socket.emit("send_message_success", {
        conversationId: IDConversation,
        message: messageWithUsers,
        conversationUpdates: {
          listImage: updatedConversation.listImage || [],
          listFile: updatedConversation.listFile || [],
          listVideo: updatedConversation.listVideo || [],
          lastChange: updatedConversation.lastChange
        }
      });
      
    } catch (error) {
      console.error("Error replying to message:", error);
      socket.emit("error", {
        message: "Lỗi khi trả lời tin nhắn",
        error: error.message,
      });
    }
  });
};

// Thêm vào socketController.js
const handlePinGroupMessage = (io, socket) => {
  socket.on("pin_group_message", async (payload) => {
    try {
      const { IDConversation, IDUser, IDMessage, isPinned } = payload

      // Kiểm tra conversation có tồn tại không
      const conversation = await Conversation.findOne({
        idConversation: IDConversation,
        isGroup: true,
      })

      if (!conversation) {
        socket.emit("pin_message_response", {
          success: false,
          message: "Không tìm thấy nhóm chat",
        })
        return
      }

      // Kiểm tra người dùng có trong nhóm không
      if (!conversation.groupMembers.includes(IDUser)) {
        socket.emit("pin_message_response", {
          success: false,
          message: "Bạn không phải thành viên của nhóm",
        })
        return
      }

      // Kiểm tra quyền ghim tin nhắn (chỉ trưởng nhóm và quản trị viên)
      const isOwner = conversation.rules.IDOwner === IDUser
      const isCoOwner = conversation.rules.listIDCoOwner.includes(IDUser)

      if (!isOwner && !isCoOwner) {
        socket.emit("pin_message_response", {
          success: false,
          message: "Bạn không có quyền ghim tin nhắn",
        })
        return
      }

      // Kiểm tra tin nhắn có tồn tại không
      const message = await MessageDetail.findOne({
        idMessage: IDMessage,
        idConversation: IDConversation,
      })

      if (!message) {
        socket.emit("pin_message_response", {
          success: false,
          message: "Không tìm thấy tin nhắn",
        })
        return
      }

      // Cập nhật trạng thái ghim tin nhắn
      await MessageDetail.findOneAndUpdate({ idMessage: IDMessage }, { isPinned: isPinned })

      // Lấy thông tin người dùng
      const user = await User.findOne({ id: IDUser }).select("fullname")
      const sender = await User.findOne({ id: message.idSender }).select("fullname")

      // Tạo thông báo hệ thống
      const action = isPinned ? "đã ghim" : "đã bỏ ghim"
      const systemMessage = await MessageDetail.create({
        idMessage: uuidv4(),
        idSender: "system",
        idConversation: IDConversation,
        type: "system",
        content: `${user.fullname || IDUser} ${action} một tin nhắn của ${sender.fullname || message.idSender}`,
        dateTime: new Date().toISOString(),
        isRead: false,
      })

      // Cập nhật lastChange của conversation
      await updateLastChangeConversation(IDConversation, systemMessage.idMessage)

      // Thông báo cho người ghim
      socket.emit("pin_message_response", {
        success: true,
        message: `Tin nhắn đã ${isPinned ? "được ghim" : "bỏ ghim"} thành công`,
        messageId: IDMessage,
        isPinned,
      })

      // Thông báo cho các thành viên khác
      conversation.groupMembers.forEach((member) => {
        if (member !== IDUser) {
          const memberSocket = getUser(member)
          if (memberSocket) {
            io.to(memberSocket.socketId).emit("message_pin_status_changed", {
              conversationId: IDConversation,
              messageId: IDMessage,
              isPinned,
              pinnedBy: IDUser,
              systemMessage,
            })
          }
        }
      })
    } catch (error) {
      console.error("Error pinning message:", error)
      socket.emit("pin_message_response", {
        success: false,
        message: "Lỗi khi ghim tin nhắn",
        error: error.message,
      })
    }
  })
}

const handleLeaveGroup = (io, socket) => {
  socket.on("leave_group", async (payload) => {
    try {
      const { IDConversation, IDUser } = payload

      // Tìm conversation dựa trên idConversation
      const conversation = await Conversation.findOne({
        idConversation: IDConversation,
        isGroup: true,
      })

      if (!conversation) {
        socket.emit("leave_group_response", {
          success: false,
          message: "Không tìm thấy nhóm chat này",
        })
        return
      }

      // Kiểm tra người dùng có trong nhóm không
      if (!conversation.groupMembers.includes(IDUser)) {
        socket.emit("leave_group_response", {
          success: false,
          message: "Bạn không phải thành viên của nhóm này",
        })
        return
      }

      // Kiểm tra nếu là trưởng nhóm thì không được rời nhóm
      if (conversation.rules.IDOwner === IDUser) {
        socket.emit("leave_group_response", {
          success: false,
          message: "Trưởng nhóm không thể rời nhóm. Vui lòng chuyển quyền trưởng nhóm trước khi rời nhóm.",
        })
        return
      }

      // Lấy thông tin người dùng để tạo thông báo
      const user = await User.findOne({ id: IDUser }).select("fullname")
      const userName = user ? user.fullname : IDUser

      // Xóa người dùng khỏi danh sách thành viên và co-owner
      await Conversation.updateOne(
        { idConversation: IDConversation },
        {
          $pull: {
            groupMembers: IDUser,
            "rules.listIDCoOwner": IDUser,
          },
          lastChange: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
        },
      )

      // Xóa conversation record của người dùng rời nhóm
      await conversationController.removeConversationByID(IDConversation, IDUser)

      // Tạo thông báo hệ thống
      const systemMessage = await MessageDetail.create({
        idMessage: uuidv4(),
        idSender: "system",
        idConversation: IDConversation,
        type: "system",
        content: `${userName} đã rời khỏi nhóm`,
        dateTime: new Date().toISOString(),
        isRead: false,
      })

      // Cập nhật idNewestMessage của conversation
      await updateLastChangeConversation(IDConversation, systemMessage.idMessage)

      // Thông báo thành công cho người rời nhóm
      socket.emit("leave_group_response", {
        success: true,
        message: "Bạn đã rời khỏi nhóm thành công",
        conversationId: IDConversation,
      })

      // Thông báo cho client cập nhật danh sách conversation
      socket.emit("new_group_conversation", "Load conversation again!")

      // Thông báo cho các thành viên còn lại trong nhóm
      conversation.groupMembers.forEach((member) => {
        if (member !== IDUser) {
          const memberSocket = getUser(member)
          if (memberSocket) {
            io.to(memberSocket.socketId).emit("member_left_group", {
              conversationId: IDConversation,
              userId: IDUser,
              userName: userName,
              message: systemMessage,
            })

            // Thông báo load lại conversation cho thành viên còn lại
            io.to(memberSocket.socketId).emit("new_group_conversation", "Load conversation again!")
          }
        }
      })
    } catch (error) {
      console.error("Error leaving group:", error)
      socket.emit("leave_group_response", {
        success: false,
        message: "Lỗi khi rời nhóm",
        error: error.message,
      })
    }
  })
}

const handleLoadGroupConversation = (io, socket) => {
  socket.on("load_group_conversations", async (payload) => {
    try {
      const { IDUser, lastEvaluatedKey } = payload
      const skip = lastEvaluatedKey ? Number.parseInt(lastEvaluatedKey) : 0
      const limit = 10

      // Query only group conversations
      const conversations = await Conversation.find({
        isGroup: true,
        groupMembers: { $in: [IDUser] }, // Only find groups where user is a member
      })
        .sort({ lastChange: -1 })
        .skip(skip)
        .limit(limit)

      // Enhance conversations with additional details
      const conversationsWithDetails = await Promise.all(
        conversations.map(async (conv) => {
          // Identify the owner, co-owners and regular members
          const ownerId = conv.rules?.IDOwner || ""
          const coOwnerIds = conv.rules?.listIDCoOwner || []
          const allMemberIds = conv.groupMembers || []

          // Filter out owner and co-owners from regular members
          const regularMemberIds = allMemberIds.filter((id) => id !== ownerId && !coOwnerIds.includes(id))

          // Get owner info
          const ownerInfo = await User.findOne({
            id: ownerId,
          }).select("id fullname urlavatar status")

          // Get co-owners info
          const coOwnersInfo = await User.find({
            id: { $in: coOwnerIds },
          }).select("id fullname urlavatar status")

          // Get regular members info (limit displayed members)
          const displayLimit = 5 - (1 + coOwnerIds.length) // Adjust display limit based on owner + co-owners
          const membersLimit = displayLimit > 0 ? displayLimit : 0
          const regularMembersInfo = await User.find({
            id: { $in: regularMemberIds.slice(0, membersLimit) },
          }).select("id fullname urlavatar status")

          // Get latest message
          const latestMessage = await MessageDetail.findOne({
            idConversation: conv.idConversation,
          })
            .sort({ dateTime: -1 })
            .limit(1)
            .populate("idSender", "id fullname")

          const messagePreview = latestMessage
            ? {
                ...latestMessage.toObject(),
                preview:
                  latestMessage.type !== "text"
                    ? `Đã gửi một ${
                        latestMessage.type === "image"
                          ? "hình ảnh"
                          : latestMessage.type === "video"
                            ? "video"
                            : "tệp đính kèm"
                      }`
                    : latestMessage.content,
              }
            : null

          // Count unread messages for this user
          const unreadCount = await MessageDetail.countDocuments({
            idConversation: conv.idConversation,
            idReceiver: IDUser,
            isRead: false,
          })

          // Count total members
          const memberCount = allMemberIds.length

          // Count not displayed members
          const hiddenMembersCount = regularMemberIds.length - regularMembersInfo.length

          return {
            ...conv.toObject(),
            owner: ownerInfo,
            coOwners: coOwnersInfo,
            regularMembers: regularMembersInfo,
            hiddenMembersCount,
            totalMembers: memberCount,
            latestMessage: messagePreview,
            unreadCount,
            userRole: {
              isOwner: ownerId === IDUser,
              isCoOwner: coOwnerIds.includes(IDUser),
            },
          }
        }),
      )

      // Calculate total for pagination
      const total = await Conversation.countDocuments({
        isGroup: true,
        groupMembers: IDUser,
      })

      const hasMore = total > skip + limit

      socket.emit("load_group_conversations_response", {
        Items: conversationsWithDetails,
        LastEvaluatedKey: hasMore ? skip + limit : null,
        total,
      })
    } catch (error) {
      console.error("Error loading group conversations:", error)
      socket.emit("error", {
        message: "Lỗi khi tải cuộc trò chuyện nhóm",
        error: error.message,
      })
    }
  })
}

const handleMessageReaction = (io, socket) => {
  socket.on("add_reaction", async (payload) => {
    try {
      const { IDUser, IDMessage, reaction, count = 1 } = payload

      // Validate reaction
      const validReactions = ["👍", "❤️", "😂", "😮", "😢", "😡"]
      if (!validReactions.includes(reaction)) {
        throw new Error("Reaction không hợp lệ")
      }

      // Find the message
      const message = await MessageDetail.findOne({ idMessage: IDMessage })
      if (!message) {
        throw new Error("Không tìm thấy tin nhắn")
      }

      // Find conversation to determine members
      const conversation = await Conversation.findOne({ idConversation: message.idConversation })
      if (!conversation) {
        throw new Error("Không tìm thấy cuộc trò chuyện")
      }

      // Initialize reactions if not exists
      if (!message.reactions) {
        message.reactions = new Map()
        validReactions.forEach((emoji) => {
          message.reactions.set(emoji, {
            reaction: emoji,
            userReactions: [],
            totalCount: 0,
          })
        })
      }

      // Get the specific reaction data
      let reactionData = message.reactions.get(reaction)
      if (!reactionData) {
        reactionData = {
          reaction: reaction,
          userReactions: [],
          totalCount: 0,
        }
        message.reactions.set(reaction, reactionData)
      }

      // Find if user already has this reaction
      const userReactionIndex = reactionData.userReactions.findIndex((ur) => ur.userId === IDUser)

      if (userReactionIndex !== -1) {
        // User already has this reaction
        const userReaction = reactionData.userReactions[userReactionIndex]
        const oldCount = userReaction.count

        // Update user's reaction count or remove if count is 0
        if (count > 0) {
          // Tăng số lượng reaction lên 1 mỗi khi người dùng thả cùng emoji
          userReaction.count += 1;
          
          // Cập nhật lại tổng số reaction - chỉ cần tăng thêm 1 đơn vị
          reactionData.totalCount += 1;
        } else {
          reactionData.userReactions.splice(userReactionIndex, 1)
          // Giảm tổng số reaction khi xóa reaction
          reactionData.totalCount -= oldCount;
        }
      } else if (count > 0) {
        // User doesn't have this reaction yet
        reactionData.userReactions.push({
          userId: IDUser,
          count: count,
        })

        // Update total count
        reactionData.totalCount += count
      }

      // Save the message
      await message.save()

      // Get user info
      const user = await User.findOne({ id: IDUser }).select("id fullname urlavatar")

      // Get all users who reacted
      const allUserIds = new Set()
      for (const [_, data] of message.reactions.entries()) {
        data.userReactions.forEach((ur) => allUserIds.add(ur.userId))
      }

      const allUsers = await User.find({ id: { $in: Array.from(allUserIds) } }).select("id fullname urlavatar")

      // Create user map for easy access
      const userMap = {}
      allUsers.forEach((user) => {
        userMap[user.id] = {
          id: user.id,
          fullname: user.fullname,
          urlavatar: user.urlavatar,
        }
      })

      // Create reaction summary for client
      const reactionSummary = {}
      for (const [key, data] of message.reactions.entries()) {
        if (data.totalCount > 0) {
          reactionSummary[key] = {
            reaction: data.reaction,
            totalCount: data.totalCount,
            userReactions: data.userReactions.map((ur) => ({
              user: userMap[ur.userId] || { id: ur.userId, fullname: "Unknown User" },
              count: ur.count,
            })),
          }
        }
      }

      const reactionUpdate = {
        messageId: IDMessage,
        reactions: reactionSummary,
        currentUser: user,
      }

      // Send update to all users in the conversation
      if (conversation.isGroup) {
        // If group, send to all members
        conversation.groupMembers.forEach((memberId) => {
          const memberSocket = getUser(memberId)
          if (memberSocket) {
            io.to(memberSocket.socketId).emit("message_reaction_updated", reactionUpdate)
          }
        })
      } else {
        // If direct chat, send to sender and receiver
        const receiverId = message.idSender === IDUser ? message.idReceiver : message.idSender

        // Send to receiver if online
        const receiverSocket = getUser(receiverId)
        if (receiverSocket) {
          io.to(receiverSocket.socketId).emit("message_reaction_updated", reactionUpdate)
        }

        // Send to reaction sender
        socket.emit("message_reaction_updated", reactionUpdate)
      }
    } catch (error) {
      console.error("Error adding reaction:", error)
      socket.emit("error", {
        message: "Lỗi khi thêm reaction",
        error: error.message,
      })
    }
  })
}

const handleMentionUser = (io, socket) => {
  socket.on("mention_user", async (payload) => {
    try {
      const { IDSender, IDConversation, mentionedUsers, messageId } = payload

      // Kiểm tra dữ liệu đầu vào
      if (!IDSender || !IDConversation || !Array.isArray(mentionedUsers) || mentionedUsers.length === 0 || !messageId) {
        throw new Error("Dữ liệu không hợp lệ")
      }

      // Tìm conversation để xác định loại (nhóm hay đơn)
      const conversation = await Conversation.findOne({ idConversation: IDConversation })
      if (!conversation) {
        throw new Error("Không tìm thấy cuộc trò chuyện")
      }

      // Tìm tin nhắn để cập nhật thông tin mention
      const message = await MessageDetail.findOne({ idMessage: messageId })
      if (!message) {
        throw new Error("Không tìm thấy tin nhắn")
      }

      // Cập nhật thông tin mention trong tin nhắn
      message.mentionedUsers = mentionedUsers
      await message.save()

      // Lấy thông tin người gửi
      const sender = await User.findOne({ id: IDSender }).select("id fullname urlavatar")

      // Lấy thông tin người được nhắc
      const mentionedUsersInfo = await User.find({
        id: { $in: mentionedUsers },
      }).select("id fullname urlavatar")

      // Tạo map để dễ dàng truy cập thông tin người dùng
      const userMap = {}
      mentionedUsersInfo.forEach((user) => {
        userMap[user.id] = {
          id: user.id,
          fullname: user.fullname,
          urlavatar: user.urlavatar,
        }
      })

      // Chuẩn bị dữ liệu thông báo
      const mentionData = {
        messageId: messageId,
        conversationId: IDConversation,
        sender: {
          id: sender.id,
          fullname: sender.fullname,
          urlavatar: sender.urlavatar,
        },
        mentionedUsers: mentionedUsers.map((userId) => userMap[userId] || { id: userId }),
        isGroup: conversation.isGroup,
        groupName: conversation.isGroup ? conversation.groupName || "Nhóm chat" : null,
        timestamp: new Date().toISOString(),
      }

      // Gửi thông báo đến những người được nhắc
      mentionedUsers.forEach((userId) => {
        // Không gửi thông báo cho chính người gửi
        if (userId !== IDSender) {
          const userSocket = getUser(userId)
          if (userSocket) {
            io.to(userSocket.socketId).emit("user_mentioned", mentionData)
          }
        }
      })

      // Gửi xác nhận cho người gửi
      socket.emit("mention_user_response", {
        success: true,
        messageId: messageId,
        mentionedUsers: mentionedUsers,
      })
    } catch (error) {
      console.error("Error handling user mention:", error)
      socket.emit("mention_user_response", {
        success: false,
        message: "Lỗi khi nhắc người dùng",
        error: error.message,
      })
    }
  })
}
const Poll = require("../models/PollModel")

// Hàm xử lý tạo bình chọn
const handleCreatePoll = (io, socket) => {
  socket.on("create_poll", async (payload) => {
    try {
      const { idCreator, idConversation, question, options, settings = {} } = payload

      // Kiểm tra dữ liệu đầu vào
      if (!idCreator || !idConversation || !question || !Array.isArray(options) || options.length < 2) {
        throw new Error("Dữ liệu không hợp lệ")
      }

      // Tìm conversation để xác định loại (phải là nhóm)
      const conversation = await Conversation.findOne({ idConversation })
      if (!conversation) {
        throw new Error("Không tìm thấy cuộc trò chuyện")
      }

      if (!conversation.isGroup) {
        throw new Error("Chỉ có thể tạo bình chọn trong nhóm chat")
      }

      // Kiểm tra người tạo có trong nhóm không
      const isCreatorInGroup =
        conversation.groupMembers.includes(idCreator) ||
        conversation.coOwners.includes(idCreator) ||
        conversation.owner === idCreator

      if (!isCreatorInGroup) {
        throw new Error("Bạn không phải là thành viên của nhóm này")
      }

      // Tạo ID cho poll và các options
      const idPoll = uuidv4()
      const pollOptions = options.map((option) => ({
        id: uuidv4(),
        text: option,
        voters: [],
        voteCount: 0,
      }))

      // Tạo tin nhắn thông báo về poll
      const messageContent = `${question}\n\n${options.map((opt, index) => `${index + 1}. ${opt}`).join("\n")}`

      // Tạo tin nhắn trong database
      const idMessage = uuidv4()
      const newMessage = new MessageDetail({
        idMessage,
        idConversation,
        idSender: idCreator,
        idReceiver: idConversation,
        content: messageContent,
        type: "poll",
        timestamp: new Date(),
        isRemove: false,
        isRecall: false,
        isPoll: true,
        pollId: idPoll,
      })

      await newMessage.save()

      // Tạo poll trong database
      const newPoll = new Poll({
        idPoll,
        idConversation,
        idCreator,
        idMessage,
        question,
        options: pollOptions,
        settings: {
          allowMultipleVotes: settings.allowMultipleVotes || false,
          allowAddOptions: settings.allowAddOptions || false,
          hideVoters: settings.hideVoters || false,
          endDate: settings.endDate || null,
        },
      })

      await newPoll.save()

      // Lấy thông tin người tạo
      const creator = await User.findOne({ id: idCreator }).select("id fullname urlavatar")

      // Chuẩn bị dữ liệu để gửi về client
      const pollData = {
        idPoll,
        idMessage,
        idConversation,
        creator: {
          id: creator.id,
          fullname: creator.fullname,
          urlavatar: creator.urlavatar,
        },
        question,
        options: pollOptions.map((opt) => ({
          id: opt.id,
          text: opt.text,
          voteCount: 0,
          voters: [],
        })),
        settings: newPoll.settings,
        createdAt: newPoll.createdAt,
      }

      // Gửi thông báo đến tất cả thành viên trong nhóm
      conversation.groupMembers.forEach((memberId) => {
        const memberSocket = getUser(memberId)
        if (memberSocket) {
          io.to(memberSocket.socketId).emit("poll_created", pollData)
        }
      })

      // Gửi xác nhận cho người tạo
      socket.emit("create_poll_response", {
        success: true,
        poll: pollData,
      })
    } catch (error) {
      console.error("Error creating poll:", error)
      socket.emit("create_poll_response", {
        success: false,
        message: "Lỗi khi tạo bình chọn",
        error: error.message,
      })
    }
  })
}

// Hàm xử lý bình chọn
const handleVotePoll = (io, socket) => {
  socket.on("vote_poll", async (payload) => {
    try {
      const { idUser, idPoll, optionIds } = payload

      // Kiểm tra dữ liệu đầu vào
      if (!idUser || !idPoll || !Array.isArray(optionIds) || optionIds.length === 0) {
        throw new Error("Dữ liệu không hợp lệ")
      }

      // Tìm poll
      const poll = await Poll.findOne({ idPoll })
      if (!poll) {
        throw new Error("Không tìm thấy bình chọn")
      }

      // Kiểm tra poll có còn active không
      if (!poll.isActive) {
        throw new Error("Bình chọn đã kết thúc")
      }

      // Kiểm tra nếu poll có endDate và đã hết hạn
      if (poll.settings.endDate && new Date() > new Date(poll.settings.endDate)) {
        poll.isActive = false
        await poll.save()
        throw new Error("Bình chọn đã hết hạn")
      }

      // Tìm conversation để xác định thành viên
      const conversation = await Conversation.findOne({ idConversation: poll.idConversation })
      if (!conversation) {
        throw new Error("Không tìm thấy cuộc trò chuyện")
      }

      // Kiểm tra người bình chọn có trong nhóm không
      const isVoterInGroup =
        conversation.groupMembers.includes(idUser) ||
        conversation.coOwners.includes(idUser) ||
        conversation.owner === idUser

      if (!isVoterInGroup) {
        throw new Error("Bạn không phải là thành viên của nhóm này")
      }

      // Kiểm tra nếu không cho phép bình chọn nhiều lựa chọn
      if (!poll.settings.allowMultipleVotes && optionIds.length > 1) {
        throw new Error("Bình chọn này chỉ cho phép chọn một lựa chọn")
      }

      // Xóa các bình chọn cũ của người dùng này (nếu có)
      poll.options.forEach((option) => {
        const voterIndex = option.voters.indexOf(idUser)
        if (voterIndex !== -1) {
          option.voters.splice(voterIndex, 1)
          option.voteCount = Math.max(0, option.voteCount - 1)
        }
      })

      // Thêm bình chọn mới
      let validOptionCount = 0
      optionIds.forEach((optionId) => {
        const option = poll.options.find((opt) => opt.id === optionId)
        if (option) {
          option.voters.push(idUser)
          option.voteCount += 1
          validOptionCount += 1
        }
      })

      if (validOptionCount === 0) {
        throw new Error("Không tìm thấy lựa chọn hợp lệ")
      }

      // Lưu thay đổi
      await poll.save()

      // Lấy thông tin người bình chọn
      const voter = await User.findOne({ id: idUser }).select("id fullname urlavatar")

      // Chuẩn bị dữ liệu để gửi về client
      const voteData = {
        idPoll,
        idConversation: poll.idConversation,
        voter: {
          id: voter.id,
          fullname: voter.fullname,
          urlavatar: voter.urlavatar,
        },
        options: poll.options.map((opt) => ({
          id: opt.id,
          voteCount: opt.voteCount,
          voters: poll.settings.hideVoters ? [] : opt.voters,
        })),
      }

      // Gửi thông báo đến tất cả thành viên trong nhóm
      conversation.groupMembers.forEach((memberId) => {
        const memberSocket = getUser(memberId)
        if (memberSocket) {
          io.to(memberSocket.socketId).emit("poll_updated", voteData)
        }
      })

      // Gửi xác nhận cho người bình chọn
      socket.emit("vote_poll_response", {
        success: true,
        vote: voteData,
      })
    } catch (error) {
      console.error("Error voting poll:", error)
      socket.emit("vote_poll_response", {
        success: false,
        message: "Lỗi khi bình chọn",
        error: error.message,
      })
    }
  })
}

// Hàm xử lý thêm lựa chọn mới vào bình chọn
const handleAddPollOption = (io, socket) => {
  socket.on("add_poll_option", async (payload) => {
    try {
      const { idUser, idPoll, optionText } = payload

      // Kiểm tra dữ liệu đầu vào
      if (!idUser || !idPoll || !optionText || optionText.trim() === "") {
        throw new Error("Dữ liệu không hợp lệ")
      }

      // Tìm poll
      const poll = await Poll.findOne({ idPoll })
      if (!poll) {
        throw new Error("Không tìm thấy bình chọn")
      }

      // Kiểm tra poll có còn active không
      if (!poll.isActive) {
        throw new Error("Bình chọn đã kết thúc")
      }

      // Kiểm tra nếu poll có cho phép thêm lựa chọn không
      if (!poll.settings.allowAddOptions) {
        throw new Error("Bình chọn này không cho phép thêm lựa chọn mới")
      }

      // Tìm conversation để xác định thành viên
      const conversation = await Conversation.findOne({ idConversation: poll.idConversation })
      if (!conversation) {
        throw new Error("Không tìm thấy cuộc trò chuyện")
      }

      // Kiểm tra người thêm lựa chọn có trong nhóm không
      const isUserInGroup =
        conversation.groupMembers.includes(idUser) ||
        conversation.coOwners.includes(idUser) ||
        conversation.owner === idUser

      if (!isUserInGroup) {
        throw new Error("Bạn không phải là thành viên của nhóm này")
      }

      // Tạo lựa chọn mới
      const newOption = {
        id: uuidv4(),
        text: optionText.trim(),
        voters: [],
        voteCount: 0,
      }

      // Thêm lựa chọn mới vào poll
      poll.options.push(newOption)

      // Lưu thay đổi
      await poll.save()

      // Lấy thông tin người thêm lựa chọn
      const user = await User.findOne({ id: idUser }).select("id fullname urlavatar")

      // Chuẩn bị dữ liệu để gửi về client
      const optionData = {
        idPoll,
        idConversation: poll.idConversation,
        addedBy: {
          id: user.id,
          fullname: user.fullname,
          urlavatar: user.urlavatar,
        },
        newOption: {
          id: newOption.id,
          text: newOption.text,
          voteCount: 0,
          voters: [],
        },
      }

      // Gửi thông báo đến tất cả thành viên trong nhóm
      conversation.groupMembers.forEach((memberId) => {
        const memberSocket = getUser(memberId)
        if (memberSocket) {
          io.to(memberSocket.socketId).emit("poll_option_added", optionData)
        }
      })

      // Gửi xác nhận cho người thêm lựa chọn
      socket.emit("add_poll_option_response", {
        success: true,
        option: optionData,
      })
    } catch (error) {
      console.error("Error adding poll option:", error)
      socket.emit("add_poll_option_response", {
        success: false,
        message: "Lỗi khi thêm lựa chọn",
        error: error.message,
      })
    }
  })
}

// Hàm xử lý kết thúc bình chọn
const handleEndPoll = (io, socket) => {
  socket.on("end_poll", async (payload) => {
    try {
      const { idUser, idPoll } = payload

      // Kiểm tra dữ liệu đầu vào
      if (!idUser || !idPoll) {
        throw new Error("Dữ liệu không hợp lệ")
      }

      // Tìm poll
      const poll = await Poll.findOne({ idPoll })
      if (!poll) {
        throw new Error("Không tìm thấy bình chọn")
      }

      // Kiểm tra poll có còn active không
      if (!poll.isActive) {
        throw new Error("Bình chọn đã kết thúc")
      }

      // Tìm conversation để xác định quyền
      const conversation = await Conversation.findOne({ idConversation: poll.idConversation })
      if (!conversation) {
        throw new Error("Không tìm thấy cuộc trò chuyện")
      }

      // Kiểm tra người kết thúc có quyền không (người tạo poll, chủ nhóm hoặc quản trị viên)
      const hasPermission =
        poll.idCreator === idUser || conversation.owner === idUser || conversation.coOwners.includes(idUser)

      if (!hasPermission) {
        throw new Error("Bạn không có quyền kết thúc bình chọn này")
      }

      // Kết thúc poll
      poll.isActive = false
      await poll.save()

      // Lấy thông tin người kết thúc
      const user = await User.findOne({ id: idUser }).select("id fullname urlavatar")

      // Chuẩn bị dữ liệu để gửi về client
      const endData = {
        idPoll,
        idConversation: poll.idConversation,
        endedBy: {
          id: user.id,
          fullname: user.fullname,
          urlavatar: user.urlavatar,
        },
        options: poll.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          voteCount: opt.voteCount,
          voters: poll.settings.hideVoters ? [] : opt.voters,
        })),
        endedAt: new Date(),
      }

      // Gửi thông báo đến tất cả thành viên trong nhóm
      conversation.groupMembers.forEach((memberId) => {
        const memberSocket = getUser(memberId)
        if (memberSocket) {
          io.to(memberSocket.socketId).emit("poll_ended", endData)
        }
      })

      // Gửi xác nhận cho người kết thúc
      socket.emit("end_poll_response", {
        success: true,
        poll: endData,
      })
    } catch (error) {
      console.error("Error ending poll:", error)
      socket.emit("end_poll_response", {
        success: false,
        message: "Lỗi khi kết thúc bình chọn",
        error: error.message,
      })
    }
  })
}

// Hàm xử lý lấy thông tin bình chọn
const handleGetPoll = (io, socket) => {
  socket.on("get_poll", async (payload) => {
    try {
      const { idUser, idPoll } = payload

      // Kiểm tra dữ liệu đầu vào
      if (!idUser || !idPoll) {
        throw new Error("Dữ liệu không hợp lệ")
      }

      // Tìm poll
      const poll = await Poll.findOne({ idPoll })
      if (!poll) {
        throw new Error("Không tìm thấy bình chọn")
      }

      // Tìm conversation để xác định thành viên
      const conversation = await Conversation.findOne({ idConversation: poll.idConversation })
      if (!conversation) {
        throw new Error("Không tìm thấy cuộc trò chuyện")
      }

      // Kiểm tra người yêu cầu có trong nhóm không
      const isUserInGroup =
        conversation.groupMembers.includes(idUser) ||
        conversation.coOwners.includes(idUser) ||
        conversation.owner === idUser

      if (!isUserInGroup) {
        throw new Error("Bạn không phải là thành viên của nhóm này")
      }

      // Lấy thông tin người tạo
      const creator = await User.findOne({ id: poll.idCreator }).select("id fullname urlavatar")

      // Chuẩn bị dữ liệu để gửi về client
      const pollData = {
        idPoll: poll.idPoll,
        idMessage: poll.idMessage,
        idConversation: poll.idConversation,
        creator: {
          id: creator.id,
          fullname: creator.fullname,
          urlavatar: creator.urlavatar,
        },
        question: poll.question,
        options: poll.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          voteCount: opt.voteCount,
          voters: poll.settings.hideVoters ? [] : opt.voters,
        })),
        settings: poll.settings,
        createdAt: poll.createdAt,
        updatedAt: poll.updatedAt,
        isActive: poll.isActive,
      }

      // Gửi thông tin poll cho người yêu cầu
      socket.emit("get_poll_response", {
        success: true,
        poll: pollData,
      })
    } catch (error) {
      console.error("Error getting poll:", error)
      socket.emit("get_poll_response", {
        success: false,
        message: "Lỗi khi lấy thông tin bình chọn",
        error: error.message,
      })
    }
  })
}

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
  handleLoadMessages,
  handleGetNewestMessages,
  handleCheckUsersStatus,
  handleUserDisconnect,
  handleCreateConversation,
  handleCreatGroupConversation,
  handleAddMemberToGroup,
  handleRemoveMemberFromGroup,
  handleDeleteGroup,
  handleLoadMemberOfGroup,
  handleChangeOwnerGroup,
  handleSendGroupMessage,
  handleJoinConversation,
  handleLeaveConversation,
  handleUpdateGroupInfo,
  handlePromoteMemberToAdmin,
  handleDemoteMember,
  handleSearchMessagesInGroup,
  handlePinGroupMessage,
  handleLeaveGroup,
  handleLoadGroupConversation,
  handleReplyMessage,
  handleMessageReaction,
  handleMentionUser,
  handleMentionUser,
  handleCreatePoll,
  handleVotePoll,
  handleAddPollOption,
  handleEndPoll,
  handleGetPoll,
}
