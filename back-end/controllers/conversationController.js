const dynamoose = require("../config/connectDynamodb");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");
const MessageDetailModel = require("../models/MessageDetailModel");
const MessageController = require("./messageController");
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

const createNewGroupConversation = async (
  IDOwner,
  groupName,
  groupAvatar,
  groupMembers
) => {
  try {
    // 1. Tạo thông tin conversation group
    const dataConversation = await createNewInfoConversationGroup(
      groupName,
      groupAvatar,
      IDOwner,
      groupMembers
    );

    // 2. Tạo message đầu tiên cho group
    await MessageController.createNewMessage(
      dataConversation.idConversation
    );

    // 3. Tạo bản ghi conversation
    const conversation = new Conversation(dataConversation);
    await conversation.save();

    return conversation;
  } catch (error) {
    console.error('Error creating group conversation:', error);
    throw error;
  }
};

const createNewInfoConversationGroup = async (
  groupName,
  groupAvatar,
  IDOwner,
  groupMembers
) => {
  try {
    let urlavatar = null;
    if (groupAvatar) {
      // 1. Upload ảnh lên S3
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: uuidv4(),
        Body: groupAvatar,
        ContentType: groupAvatar.mimetype
      };

      const s3Data = await s3.upload(params).promise();
      urlavatar = s3Data.Location;
    } else {
      urlavatar = "https://danhgiaxe.edu.vn/upload/2024/12/99-mau-avatar-nhom-dep-nhat-danh-cho-team-dong-nguoi-30.webp";
    }

    // 2. Tạo conversation data theo MongoDB Schema
    const conversationData = {
      idConversation: uuidv4(),
      idSender: IDOwner,
      isGroup: true,
      groupName: groupName,
      groupAvatar: urlavatar,
      groupMembers: groupMembers,
      rules: {
        IDOwner: IDOwner,
        listIDCoOwner: []
      },
      isBlock: false,
      idNewestMessage: null,
      lastChange: moment.tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm:ss.SSS')
    };

    return conversationData;

  } catch (error) {
    console.error('Error preparing group info:', error);
    throw error;
  }
};

const getMessageDetailByIDConversation = async (req, res) => {
  try {
    const { IDConversation, IDNextBucket } = req.body;

    // Validate input
    if (!IDConversation) {
      return res.status(400).json({ message: "thiếu IDConversation" });
    }

    // Kiểm tra quyền truy cập conversation
    const conversation = await Conversation.findOne({
      idConversation: IDConversation,
      $or: [
        { idSender: req.user?.id },
        { groupMembers: req.user?.id }
      ]
    });

    if (!conversation) {
      return res.status(403).json({ message: "Từ chối truy cập đoạn hội thoại này" });
    }

    // Lấy bucket message và message details
    let dataBucketMessage;
    if (IDNextBucket) {
      dataBucketMessage = await BucketMessageController.getMessageBucketByID(IDNextBucket);
    } else {
      const dataMessage = await MessageController.getMessageByID(IDConversation);
      if (!dataMessage) {
        return res.status(200).json({ message: "No messages found" });
      }
      dataBucketMessage = await BucketMessageController.getMessageBucketByID(
        dataMessage.IDNewestBucket
      );
    }

    if (!dataBucketMessage?.listIDMessageDetail?.length) {
      return res.status(200).json({ message: "No message detail" });
    }

    // Query message details và users một lần
    const messageDetails = await MessageDetailModel.find({
      id: { $in: dataBucketMessage.listIDMessageDetail }
    });

    // Lấy unique user IDs và query users một lần
    const userIds = [...new Set(messageDetails.map(msg => msg.idSender))];  
    const users = await UserModel.find({ id: { $in: userIds }});
    
    // Tạo map để lookup user nhanh hơn
    const userMap = users.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {});

    // Map data và thêm thông tin user
    const listMessageDetail = messageDetails
      .map(msg => ({
        ...msg.toObject(),
        userSender: userMap[msg.idSender]
      }))
      .reverse();

    return res.status(200).json({
      listMessageDetail,
      IDNextBucket: dataBucketMessage.IDNextBucket
    });

  } catch (error) {
    console.error('Error getting message details:', error);
    return res.status(500).json({
      message: "Internal server error", 
      error: error.message
    });
  }
};

const addCoOwnerToGroup = async (IDOwner, IDConversation, IDCoOwner) => {
  try {
    // Validate input
    if (!IDConversation || !IDCoOwner) {
      throw new Error('Hãy nhập đầy đủ các trường');
    }

    // Kiểm tra conversation có tồn tại và là group không
    const conversation = await Conversation.findOne({
      'rules.IDOwner': IDOwner,
      idConversation: IDConversation,
      isGroup: true
    });

    console.log(conversation);
    

    if (!conversation) {
      throw new Error('Conversation không tồn tại hoặc bạn không có quyền thực hiện hành động này');
    }

    // Update tất cả conversations của group một lần
    const result = await Conversation.updateMany(
      { idConversation: IDConversation },
      { 
        $addToSet: { 
          'rules.listIDCoOwner': IDCoOwner 
        }
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error('Không thể thêm người này làm nhóm phó');
    }

    return {
      success: true,
      message: 'Thêm nhóm phó thành công',
      modifiedCount: result.modifiedCount
    };

  } catch (error) {
    console.error('Lỗi thêm nhóm phó:', error);
    throw error;
  }
};

const removeConversationByID = async (IDConversation, IDSender) => {
  const data = await Conversation.delete({ idConversation: IDConversation, idSender: IDSender });
  return data;
};

const removeCoOwnerFromGroup = async (IDOwner, IDConversation, IDCoOwner) => {
  try {
    // Validate input
    if (!IDConversation || !IDCoOwner) {
      throw new Error('IDConversation và IDCoOwner không được để trống');
    }

    // Kiểm tra conversation có tồn tại và là group không
    const conversation = await Conversation.findOne({
      'rules.IDOwner': IDOwner,
      idConversation: IDConversation,
      isGroup: true
    });

    if (!conversation) {
      throw new Error('Conversation không tồn tại hoặc không phải là nhóm');
    }

    // Kiểm tra có phải co-owner không
    if (!conversation.rules.listIDCoOwner.includes(IDCoOwner)) {
      throw new Error('Người này không phải là nhóm phó');
    }

    // Update tất cả conversations của group một lần
    const result = await Conversation.updateMany(
      { idConversation: IDConversation },
      { 
        $pull: { 
          'rules.listIDCoOwner': IDCoOwner 
        }
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error('Không thể xóa nhóm phó');
    }

    return {
      success: true,
      message: 'Thu hồi quyền nhóm phó thành công',
      modifiedCount: result.modifiedCount
    };

  } catch (error) {
    console.error('Lỗi xóa nhóm phó:', error);
    throw error;
  }
};

const getMemberInfoByIDConversation = async (req, res) => {
  try {
    const IDSender = req.user.id;
    const { IDConversation } = req.body;

    // Validate input
    if (!IDConversation || !IDSender) {
      return res.status(400).json({
        success: false,
        message: "IDConversation và IDSender không được để trống"
      });
    }

    // Tìm conversation
    const conversation = await Conversation.findOne({
      idConversation: IDConversation,
    });

    if (!conversation || !conversation.groupMembers?.length) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin nhóm"
      });
    }

    const conversationRules = conversation.rules;

    // Lấy thông tin members
    const membersInfo = await Promise.all(
      conversation.groupMembers.map(async (memberID) => {
        const member = await User.findOne({ id: memberID });
        
        if (!member) return null;

        return {
          id: member.id,
          fullname: member.fullname,
          urlavatar: member.urlavatar,
          email: member.email,
          roles: {
            isOwner: memberID === conversationRules.IDOwner,
            isCoOwner: conversationRules.listIDCoOwner.includes(memberID)
          },
          status: member.status || 'active'
        };
      })
    );

    // Lọc bỏ các member null và phân loại theo role
    const validMembers = membersInfo.filter(m => m !== null);
    
    return res.status(200).json({
      success: true,
      data: {
        totalMembers: validMembers.length,
        owner: validMembers.find(m => m.roles.isOwner),
        coOwners: validMembers.filter(m => m.roles.isCoOwner),
        members: validMembers.filter(m => !m.roles.isOwner && !m.roles.isCoOwner),
        groupInfo: {
          groupName: conversation.groupName,
          groupAvatar: conversation.groupAvatar,
          createdAt: conversation.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Error getting member info:', error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};

const deleteConversationByID = async (IDConversation, IDSender) => {
  const data = await Conversation.delete({
    idConversation: IDConversation,
    idSender: IDSender,
  });
  return data;
};

const leaveGroup = async (IDConversation, IDSender) => {
  try {
    // Validate input
    if (!IDConversation || !IDSender) {
      throw new Error('IDConversation và IDSender không được để trống');
    }

    // Kiểm tra conversation tồn tại và là group
    const conversation = await Conversation.findOne({
      idConversation: IDConversation,
      isGroup: true
    });

    if (!conversation) {
      throw new Error('Conversation không tồn tại hoặc không phải là nhóm');
    }

    // Kiểm tra người dùng có trong nhóm không
    if (!conversation.groupMembers.includes(IDSender)) {
      throw new Error('Người dùng không có trong nhóm');
    }

    // Kiểm tra nếu là owner thì không được rời nhóm
    if (conversation.rules.IDOwner === IDSender) {
      throw new Error('Trưởng nhóm không thể rời nhóm');
    }

    // 1. Xóa conversation của user đang rời nhóm
    await Conversation.deleteOne({
      idConversation: IDConversation,
      idSender: IDSender
    });

    // 2. Update tất cả conversations của group một lần
    const result = await Conversation.updateMany(
      { idConversation: IDConversation },
      {
        $pull: {
          groupMembers: IDSender,
          'rules.listIDCoOwner': IDSender
        },
        lastChange: moment.tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm:ss.SSS')
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error('Không thể cập nhật thông tin nhóm');
    }

    return {
      success: true,
      message: 'Rời nhóm thành công',
      modifiedCount: result.modifiedCount
    };

  } catch (error) {
    console.error('Lỗi khi rời nhóm:', error);
    throw error;
  }
};

const updateInfoGroup = async (IDSender, IDConversation, groupName, groupAvatar) => {
  try {
    // Validate input
    if (!IDConversation) {
      throw new Error('IDConversation không được để trống');
    }
    
    // Kiểm tra conversation tồn tại và là group
    const conversation = await Conversation.findOne({
      'rules.IDOwner': IDSender,
      idConversation: IDConversation,
      isGroup: true
    });

    if (!conversation) {
      throw new Error('Conversation không tồn tại hoặc không phải là nhóm');
    }

    // Upload ảnh mới nếu có
    let urlavatar;
    if (groupAvatar) {
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: uuidv4(),
        Body: groupAvatar,
        ContentType: groupAvatar.mimetype
      };

      try {
        const s3Data = await s3.upload(params).promise();
        urlavatar = s3Data.Location;
      } catch (error) {
        console.error('Error uploading avatar:', error);
        throw new Error('Không thể upload ảnh nhóm');
      }
    }

    // Update tất cả conversations của group một lần
    const updateData = {
      lastChange: moment.tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm:ss.SSS')
    };

    if (groupName) updateData.groupName = groupName;
    if (urlavatar) updateData.groupAvatar = urlavatar;

    const result = await Conversation.updateMany(
      { idConversation: IDConversation },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      throw new Error('Không thể cập nhật thông tin nhóm');
    }

    return {
      success: true,
      message: 'Cập nhật thông tin nhóm thành công',
      modifiedCount: result.modifiedCount,
      updatedData: {
        groupName: groupName || conversation.groupName,
        groupAvatar: urlavatar || conversation.groupAvatar
      }
    };

  } catch (error) {
    console.error('Error updating group info:', error);
    throw error;
  }
};

const getConversationByUserFriend = async (req, res) => {
  try {
    const IDSender = req.user.id;
    const { IDReceiver } = req.body;

    // Validate input
    if (!IDReceiver) {
      return res.status(400).json({ 
        success: false,
        message: "IDReceiver không được để trống" 
      });
    }

    // Tìm conversation 1-1 giữa 2 user
    const conversation = await Conversation.findOne({
      idSender: IDSender,
      idReceiver: IDReceiver,
      isGroup: false
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy cuộc hội thoại" 
      });
    }

    // Lấy thông tin message mới nhất nếu có
    let result = conversation.toObject();
    if (conversation.idNewestMessage) {
      const message = await MessageController.getMessageByID(conversation.idConversation);
      if (message?.IDNewestBucket) {
        const bucket = await BucketMessageController.getMessageBucketByID(message.IDNewestBucket);
        if (bucket?.listIDMessageDetail?.length > 0) {
          const newestMessageDetail = await MessageDetailModel.findById(
            bucket.listIDMessageDetail[bucket.listIDMessageDetail.length - 1]
          );
          result.newestMessageDetail = newestMessageDetail;
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error getting conversation:', error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server", 
      error: error.message
    });
  }
};

const searchConversationByName = async (IDUser, keyword) => {
  try {
    // Chuẩn hóa keyword để tìm kiếm
    const normalizedKeyword = keyword
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    // Tìm tất cả conversations của user (cả nhóm và chat 1-1)
    const conversations = await Conversation.aggregate([
      {
        $match: {
          $or: [
            { idSender: IDUser },
            { groupMembers: IDUser }
          ]
        }
      },
      {
        $sort: { lastChange: -1 }
      },
      {
        // Group theo idConversation để lấy unique conversations
        $group: {
          _id: "$idConversation",
          conversation: { $first: "$$ROOT" }
        }
      }
    ]);

    // Lấy danh sách IDReceiver để query users một lần
    const receiverIds = conversations
      .map(c => c.conversation.idReceiver)
      .filter(id => id && !c.conversation.isGroup);

    // Query tất cả users một lần
    const users = await UserModel.find({ 
      id: { $in: receiverIds }
    });

    // Tạo map để lookup user nhanh hơn  
    const userMap = users.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {});

    // Xử lý và filter conversations
    const listConversation = conversations
      .map(({ conversation }) => {
        let candidateName = "";
        let dataConversation = conversation;

        if (conversation.isGroup) {
          candidateName = conversation.groupName;
        } else {
          const user = userMap[conversation.idReceiver];
          if (!user) return null;

          candidateName = user.fullname;
          dataConversation = {
            ...conversation,
            fullnameReceiver: user.fullname,
            urlavatarReceiver: user.urlavatar
          };
        }

        const normalizedName = candidateName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();

        return normalizedName.includes(normalizedKeyword) 
          ? dataConversation 
          : null;
      })
      .filter(item => item !== null);

    return {
      success: true,
      data: listConversation
    };

  } catch (error) {
    console.error('Error searching conversations:', error);
  }
};

const getConversationByID = async (IDConversation, IDSender) => {
  // Phai truyen vao IDConversation va IDSender, IDConversation: Parition key, IDSender: Sort key
  const data = await Conversation.findOne({ idConversation: IDConversation, idSender: IDSender });
  return data;
};

const changeOwnerGroup = async (IDOwner, IDConversation, IDNewOwner) => {
  try {
    // Validate input
    if (!IDConversation || !IDNewOwner) {
      throw new Error('IDConversation và IDNewOwner không được để trống');
    }

    // Kiểm tra conversation có tồn tại và là group không
    const conversation = await Conversation.findOne({
      'rules.IDOwner': IDOwner,
      idConversation: IDConversation,
      isGroup: true
    });

    if (!conversation) {
      throw new Error('Conversation không tồn tại hoặc không phải là nhóm');
    }

    // Update tất cả conversations của group một lần
    const result = await Conversation.updateMany(
      { idConversation: IDConversation },
      { 
        $set: { 
          'rules.IDOwner': IDNewOwner,
          lastChange: moment.tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm:ss.SSS')
        }
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error('Không thể thay đổi trưởng nhóm');
    }

    // Cập nhật lại IDOwner cho tất cả các message trong group
    const messages = await MessageDetailModel.find({ idConversation: IDConversation });
    const messageUpdatePromises = messages.map(async (message) => {
      await MessageDetailModel.updateMany(
        { idConversation: IDConversation },
        { $set: { idSender: IDNewOwner } }
      );
    });
    await Promise.all(messageUpdatePromises);

    const data = await Conversation.findOne({ idConversation: IDConversation });

    return {
      success: true,
      message: 'Thay đổi trưởng nhóm thành công',
      modifiedCount: result.modifiedCount,
      updatedData: {
        IDOwner: IDNewOwner,
        groupName: data.groupName,
        groupAvatar: data.groupAvatar,
        groupMembers: data.groupMembers,
        rules: data.rules
      }
    };

  } catch (error) {
    console.error('Lỗi thay đổi trưởng nhóm:', error);
    throw error;
  }
}

const removeMemberFromGroup = async (IDOwner, IDConversation, IDMember) => {
  try {
    // Validate input
    if (!IDConversation || !IDMember) {
      throw new Error('IDConversation và IDMember không được để trống');
    }

    // Kiểm tra conversation có tồn tại và là group không
    const conversation = await Conversation.findOne({
      'rules.IDOwner': IDOwner,
      idConversation: IDConversation,
      isGroup: true
    });

    if (!conversation) {
      throw new Error('Conversation không tồn tại hoặc không phải là nhóm');
    }

    // Kiểm tra thành viên có trong nhóm không
    if (!conversation.groupMembers.includes(IDMember)) {
      throw new Error('Người dùng không có trong nhóm');
    }

    // Update tất cả conversations của group một lần
    const result = await Conversation.updateMany(
      { idConversation: IDConversation },
      { 
        $pull: { 
          groupMembers: IDMember,
          'rules.listIDCoOwner': IDMember 
        },
        lastChange: moment.tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm:ss.SSS')
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error('Không thể xóa thành viên khỏi nhóm');
    }

    const data = await Conversation.findOne({ idConversation: IDConversation });

    return {
      success: true,
      message: 'Xóa thành viên khỏi nhóm thành công',
      modifiedCount: result.modifiedCount,
      updatedData: {
        groupName: data.groupName,
        groupAvatar: data.groupAvatar,
        groupMembers: data.groupMembers,
        rules: data.rules
      }
    };

  } catch (error) {
    console.error('Lỗi xóa thành viên khỏi nhóm:', error);
    throw error;
  }
};

module.exports = {
  getConversation,
  createNewSignleConversation,
  updateConversation,
  getAllConversationByID,
  getConversation,
  getConversationByID,
  getAllConversationByID,
  createNewSignleConversation,
  updateConversation,
  getMessageDetailByIDConversation,
  createNewGroupConversation,
  createNewInfoConversationGroup,
  addCoOwnerToGroup,
  removeCoOwnerFromGroup,
  removeConversationByID,
  getMemberInfoByIDConversation,
  deleteConversationByID,
  leaveGroup,
  updateInfoGroup,
  getConversationByUserFriend,
  searchConversationByName,
  changeOwnerGroup,
  removeMemberFromGroup,
};