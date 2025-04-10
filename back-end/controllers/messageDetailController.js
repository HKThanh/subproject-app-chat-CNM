const MessageDetailModel = require("../models/MessageDetailModel");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");

/**
 * Tạo mới tin nhắn dạng text
 * @param {string} idSender - ID người gửi
 * @param {string} idConversation - ID cuộc trò chuyện
 * @param {string} textMessage - Nội dung tin nhắn
 */
const createTextMessageDetail = async (idSender, idConversation, textMessage) => {
    const data = {
        idMessage: uuidv4(),
        idSender: idSender,
        idConversation: idConversation,
        type: "text",
        content: textMessage,
        isRemove: false,
        dateTime: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
    };
    
    try {
        const newMessageDetail = await MessageDetailModel.create(data);
        return newMessageDetail;
    } catch (error) {
        console.error("Error creating text message:", error);
        throw error;
    }
};

// Tạo mới tin nhắn dạng hình ảnh
const createNewImageMessage = async (idSender, idConversation, imageUrl) => {
  const data = {
    idMessage: uuidv4(),
    idSender: idSender,
    idConversation: idConversation,
    type: "image",
    content: imageUrl,
    isRemove: false,
    dateTime: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
  };
  
  const newMessageDetail = await MessageDetailModel.create(data);
  return newMessageDetail;
};

// Tạo mới tin nhắn dạng file
const createNewFileMessage = async (idSender, idConversation, fileUrl) => {
  const data = {
    idMessage: uuidv4(),
    idSender: idSender,
    idConversation: idConversation,
    type: "file",
    content: fileUrl,
    isRemove: false,
    dateTime: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
  };
  
  const newMessageDetail = await MessageDetailModel.create(data);
  return newMessageDetail;
};

// Tạo mới tin nhắn dạng video
const createNewVideoMessage = async (idSender, idConversation, videoUrl) => {
  const data = {
    idMessage: uuidv4(),
    idSender: idSender,
    idConversation: idConversation,
    type: "video",
    content: videoUrl,
    isRemove: false,
    dateTime: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
  };
  
  const newMessageDetail = await MessageDetailModel.create(data);
  return newMessageDetail;
};

const createNewMessage = async (MessageDetail) => {
  try {
    const data = await MessageDetailModel.create(MessageDetail);
    return data;
  } catch (err) {
    console.error(err);
    return "Loi";
  }
}

module.exports = {
  createTextMessageDetail,
  createNewImageMessage,
  createNewFileMessage,
  createNewVideoMessage,
  createNewMessage
};
