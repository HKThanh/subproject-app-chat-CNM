const dynamoose = require("../config/connectDynamodb")
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");
const MessageDetailModel = require("../models/MessageDetailModel")
const getMessagesDetailByID = async (idMessageDetail) => {
    const data = await MessageDetailModel.get(idMessageDetail);
    return data;
  };

  //Tạo mới tin nhắn dạng text
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
    const newMessageDetail = await MessageDetailModel.create(data);
    return newMessageDetail;
}

// Tạo mới tin nhắn dạng hình ảnh
const createNewImageMessage = async (idSender, idConversation, image) => {
    const data = {
        idMessage: uuidv4(),
        idSender: idSender,
        idConversation: idConversation,
        type: "image",
        content: image,
        isRemove: false,
        dateTime: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
    };
    const newMessageDetail = await MessageDetailModel.create(data);
    return newMessageDetail;
}

// Tạo mới tin nhắn dạng file
const createNewFileMessage = async (idSender, idConversation, file) => {
    const data = {
      idMessage: uuidv4(),
      idSender: idSender,
      idConversation: idConversation,
      type: "file",
      content: file,
      isRemove: false,
      dateTime: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
    }
    const newMessageDetail = await MessageDetailModel.create(data);
    return newMessageDetail;
  }

// Tạo mới tin nhắn dạng video
const creatLinkMessage = async (idSender, idConversation, link) => {  
  const data = {
    idMessage: uuidv4(),
    idSender: idSender,
    idConversation: idConversation,
    type: "link",
    content: link,
    isRemove: false,
    dateTime: moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss.SSS"),
  }
  const newMessageDetail = await MessageDetailModel.create(data);
  return newMessageDetail;
}

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
  getMessagesDetailByID,
  createTextMessageDetail,
  createNewImageMessage,
  createNewFileMessage,
  creatLinkMessage,
  createNewMessage
};
