const dynamoose = require("../config/connectDynamodb");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");
const MessageDetailModel = require("../models/MessageDetailModel");
const Conversation = require("../models/ConversationModel");
const User = require("../models/UserModel");

const getConversation = async (IDUser, lastEvaluatedKey) => {
  try {
    const skip = lastEvaluatedKey ? parseInt(lastEvaluatedKey) : 0;
    const limit = 10;

    const conversations = await Conversation.find({
      $or: [{ idSender: IDUser }, { groupMembers: IDUser }],
    })
      .sort({ lastChange: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Conversation.countDocuments({
      $or: [{ idSender: IDUser }, { groupMembers: IDUser }],
    });

    const hasMore = total > skip + limit;

    return {
      Items: conversations,
      LastEvaluatedKey: hasMore ? skip + limit : null,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
};

const getAllConversationByID = async (IDConversation) => {
  try {
    const conversations = await Conversation.find({
      idConversation: IDConversation,
    });
    return { Items: conversations };
  } catch (error) {
    console.log(error);
    return null;
  }
};

const createNewSignleConversation = async (
  IDSender,
  IDReceiver,
  IDConversation
) => {
  const user = await User.findOne({ idUser: IDSender });

  if (!user) {
    throw new Error("Không tìm thấy người gửi");
  }

  if (user.blockList && user.blockList.includes(IDReceiver)) {
    throw new Error("Không thể tạo cuộc trò chuyện với người đã chặn");
  }

  const conversation = new Conversation({
    idConversation: IDConversation || uuidv4(),
    idSender: IDSender,
    idReceiver: IDReceiver,
    isGroup: false,
  });
  await conversation.save();
  return conversation;
};

const updateConversation = async (conversationData) => {
  const { idConversation, ...updateData } = conversationData;
  const result = await Conversation.findOneAndUpdate(
    { idConversation },
    updateData,
    { new: true }
  );
  return result;
};


module.exports = {
  getConversation,
  createNewSignleConversation,
  updateConversation,
  getAllConversationByID,
};