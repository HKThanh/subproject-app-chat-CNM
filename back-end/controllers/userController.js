require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { v4: uuidv4 } = require("uuid");
const qrcode = require("qrcode");

const UserModel = require("../models/UserModel");
const FriendRequestModel = require("../models/FriendRequestModel");
const redisClient = require("../services/redisClient");
const { generateOTP, sendOTP } = require("../services/otpServices");
const fileService = require("../services/fileService");

const ConversationController = require("./conversationController");
const MessageController = require("./messageController");


const userController = {};

userController.getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to get users" });
  }
};

userController.getUser = async (req, res) => {
  const id = req.user.id;

  try {
    const user = await UserModel.get(id); 

    if (!user) {
      return res.status(404).json({ message: "không tìm thấy người dùng" });
    }

    const dataReturn = {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      urlavatar: user.urlavatar,
      birthday: user.birthday,
      bio: user.bio,
      phone: user.phone,
      coverPhoto: user.coverPhoto,
      ismale: user.ismale,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }

    res.status(200).json(dataReturn);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server không thể lấy người dùng" });
  }
};

userController.resetPasswordRequest = async (req, res) => {
  const { email } = req.body;

  const user = await UserModel.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }

  const otp = generateOTP();
  console.log("OTP:", otp);
  try {
    await sendOTP(email, otp);
    const idForRedis = uuidv4();
    const data = JSON.stringify({ otp, email });

    await redisClient.setEx(idForRedis, 300, data); // Set OTP with 5 minutes expiration
    res
      .status(200)
      .json({ message: "OTP sent successfully", otp: otp, id: idForRedis });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

userController.resetPassword = async (req, res) => {
  const { otp, password } = req.body;
  const idForRedis = req.params.id;

  const redisData = await redisClient.get(idForRedis);
  if (!redisData) {
    return res.status(400).json({ message: "OTP đã hết hạn" });
  }

  const { otp: storedOtp, email: storedEmail } = JSON.parse(redisData);

  if (otp !== storedOtp) {
    return res.status(400).json({ message: "Sai mã OTP" });
  }
  const user = await UserModel.findOne({ email: storedEmail });

  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }

  bcrypt.hash(password, 10, async (err, hash) => {
    user.password = hash;
    await user.save();

    res
      .status(200)
      .json({
        message: "Cập nhật mật khẩu thành công",
        newpass: user.password,
      });
  });
};

userController.updatePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const id = req.user.id;

  const user = await UserModel.get(id);

  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }

  bcrypt.compare(oldPassword, user.password, async (err, result) => {
    if (!result) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
    }
  });

  bcrypt.hash(newPassword, 10, async (err, hash) => {
    if (newPassword === oldPassword) {
      return res
        .status(400)
        .json({ message: "Mật khẩu mới không được giống mật khẩu cũ" });
    }

    user.password = hash;
    await user.save();

    return res.status(200).json({ message: "Cập nhật mật khẩu thành công" });
  });
};

userController.updateAvatar = async (req, res) => {
  try {
    const id = req.user.id;
    const fileUrl = req.body.fileUrl;
    console.log(req.body);

    if (!fileUrl) {
      return res
        .status(400)
        .json({ message: "File avatar không được để trống" });
    }

    const user = await UserModel.get(id);

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    user.urlavatar = fileUrl; // Lưu URL từ S3
    user.updatedAt = new Date().toString();

    await user.save();

    return res.status(200).json({
      message: "Cập nhật avatar thành công",
      user: {
        id: user.id,
        email: user.email,
        urlavatar: user.urlavatar,
      },
    });
  } catch (error) {
    console.error("Error updating avatar:", error);
    return res.status(500).json({ message: "Lỗi khi cập nhật avatar" });
  }
};

userController.updateProfile = async (req, res) => {
  try {
    const id = req.user.id;
    const { fullname, ismale, birthday, bio } = req.body;
    if (!fullname && ismale === undefined && !birthday) {
      return res
        .status(400)
        .json({ message: "Cần cung cấp ít nhất một thông tin để cập nhật" });
    }

    const user = await UserModel.get(id);

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    if (fullname) user.fullname = fullname;
    if (ismale !== undefined) {
      user.ismale = ismale === true || ismale === 'true';
    }
    if (birthday) user.birthday = birthday;
    if (bio) user.bio = bio;
    user.updatedAt = new Date().toString();

    await user.save();

    return res.status(200).json({
      message: "Cập nhật thông tin thành công",
      user: {
        id: user.id,
        fullname: user.fullname,
        urlavatar: user.urlavatar,
        birthday: user.birthday,
        createdAt: user.createdAt,
        email: user.email,
        bio: user.bio,
        phone: user.phone,
        coverPhoto: user.coverPhoto,
        ismale: user.ismale,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ message: "Lỗi khi cập nhật thông tin" });
  }
};

userController.sendFriendRequest = async (req, res, io) => {
  const senderId = req.user.id;
  const { receiverId } = req.body;

  if (senderId === receiverId) {
    return res.status(400).json({ 
      code: -2, 
      message: "Gửi cho bản thân làm gì" 
    });
  }

  const user = await UserModel.get(receiverId);

  if (!user) {
    return res.status(404).json({
      code: -1,
      message: "Không tìm thấy người nhận",
    });
  }

  const existing = await FriendRequestModel.findOne({ senderId: senderId, receiverId: receiverId });

  console.log("Existing request: ", existing);
  

  if (existing) {
    if (existing.status === "ACCEPTED") {
      return res.json({ code: 2, message: "Hai bạn đã kết bạn" });
    }
    return res.json({ code: 0, message: "Yêu cầu đã được gửi" });
  }

  const sender = await UserModel.get(senderId);
  const newRequest = await FriendRequestModel.create({ 
    senderId, 
    receiverId, 
    status: "PENDING" 
  });

  // Emit socket event cho người nhận
  io.to(receiverId).emit('newFriendRequest', {
    requestId: newRequest.id,
    sender: {
      id: sender.id,
      fullname: sender.fullname,
      urlavatar: sender.urlavatar
    }
  });

  return res.json({
    code: 1,
    message: "Request sent",
    data: { senderId, receiverId }
  });
};

// Sửa lại hàm handleFriendRequest
userController.handleFriendRequest = async (req, res, io) => {
  const { id, type } = req.body;

  // Validate input
  if (!id || !type) {
      return res.status(400).json({
          success: false,
          message: "Thiếu thông tin yêu cầu kết bạn",
          data: null,
          error: "Missing id or type",
          code: -1,
      });
  }

  if (!["ACCEPTED", "DECLINED"].includes(type)) {
      return res.status(400).json({
          success: false,
          message: "Loại yêu cầu không hợp lệ",
          data: null,
          error: "Invalid type, must be ACCEPTED or DECLINED",
          code: -2,
      });
  }

  try {
      // Find the friend request
      const request = await FriendRequestModel.findOne({
          id: id,
          status: "PENDING",
      });

      if (!request) {
          return res.status(404).json({
              success: false,
              message: "Không tìm thấy yêu cầu kết bạn",
              data: null,
              error: "Friend request not found or not pending",
              code: 0,
          });
      }

      // Update request status
      request.status = type;
      await request.save();

      // Prepare response data
      const responseData = {
          id: request.id,
          senderId: request.senderId,
          receiverId: request.receiverId,
          status: request.status,
      };

      if (type === "ACCEPTED") {
          // Add to friend list
          await userController.addToFriendList(request.senderId, request.receiverId);

          // Emit socket event to both sender and receiver
          io.to(request.senderId).emit('friendRequestAccepted', {
              success: true,
              message: "Yêu cầu kết bạn đã được chấp nhận",
              data: {
                  requestId: request.id,
                  userId: request.receiverId,
              },
              error: null,
          });

          io.to(request.receiverId).emit('friendRequestAccepted', {
              success: true,
              message: "Bạn đã chấp nhận yêu cầu kết bạn",
              data: {
                  requestId: request.id,
                  userId: request.senderId,
              },
              error: null,
          });

          return res.json({
              success: true,
              message: "Yêu cầu đã được chấp nhận",
              data: responseData,
              error: null,
              code: 2,
          });
      }

      if (type === "DECLINED") {
          // Emit socket event to sender
          io.to(request.senderId).emit('friendRequestDeclined', {
              success: true,
              message: "Yêu cầu kết bạn đã bị từ chối",
              data: {
                  requestId: request.id,
              },
              error: null,
          });

          return res.json({
              success: true,
              message: "Yêu cầu đã bị từ chối",
              data: responseData,
              error: null,
              code: 1,
          });
      }
  } catch (error) {
      console.error('Handle friend request error:', error);
      return res.status(500).json({
          success: false,
          message: "Đã xảy ra lỗi khi xử lý yêu cầu kết bạn",
          data: null,
          error: error.message,
          code: -3,
      });
  }
};

userController.addToFriendList = async (senderId, receiverId) => {
  const sender = await UserModel.get(senderId);
  const receiver = await UserModel.get(receiverId);

  sender.friendList = sender.friendList || [];
  receiver.friendList = receiver.friendList || [];

  if (!sender.friendList.includes(receiverId)) {
    sender.friendList.push(receiverId);
  }
  if (!receiver.friendList.includes(senderId)) {
    receiver.friendList.push(senderId);
  }

  await Promise.all([sender.save(), receiver.save()]);
};

userController.getAllFriendRequests = async (req, res, io) => {
  try {
      const id = req.user.id;

      // Lấy tất cả yêu cầu kết bạn đang pending
      const friendRequests = await FriendRequestModel.find({
          receiverId: id,
          status: "PENDING",
      });

      // Lấy thông tin người gửi
      const requestsWithSenderInfo = await Promise.all(
          friendRequests.map(async (request) => {
              const sender = await UserModel.get(request.senderId);
              return {
                  ...request.toObject(),
                  sender: {
                      id: sender.id,
                      fullname: sender.fullname,
                      urlavatar: sender.urlavatar,
                  },
              };
          })
      );

      return res.status(200).json({
          success: true,
          message: "Lấy danh sách yêu cầu kết bạn thành công",
          data: requestsWithSenderInfo,
          error: null,
      });
  } catch (error) {
      console.error("Error fetching friend requests:", error);
      return res.status(500).json({
          success: false,
          message: "Lấy danh sách yêu cầu kết bạn thất bại",
          data: null,
          error: error.message,
      });
  }
};

userController.updateBio = async (req, res) => {
  try {
    const id = req.user.id;
    const { bio } = req.body;

    if (!bio && bio !== "") {
      return res.status(400).json({ message: "Bio không được để trống" });
    }

    const user = await UserModel.get(id);

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    user.bio = bio;
    user.updatedAt = new Date().toString();

    await user.save();

    return res.status(200).json({
      message: "Cập nhật bio thành công",
      user: {
        id: user.id,
        email: user.email,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error("Error updating bio:", error);
    return res.status(500).json({ message: "Lỗi khi cập nhật bio" });
  }
};

userController.updateCoverPhoto = async (req, res) => {
  try {
    const id = req.user.id;
    const fileUrl = req.body.fileUrl;

    if (!fileUrl) {
      return res
        .status(400)
        .json({ message: "Cover photo không được để trống" });
    }

    const user = await UserModel.get(id);

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    user.coverPhoto = fileUrl;
    user.updatedAt = new Date().toString();

    await user.save();

    return res.status(200).json({
      message: "Cập nhật cover photo thành công",
      user: {
        id: user.id,
        email: user.email,
        coverPhoto: user.coverPhoto,
      },
    });
  } catch (error) {
    console.error("Error updating cover photo:", error);
    return res.status(500).json({ message: "Lỗi khi cập nhật cover photo" });
  }
};

userController.cancelFriendRequest = async (req, res, io) => {
  const senderId = req.user.id;
  const { receiverId } = req.params;

  try {
    const request = await FriendRequestModel.findOne({
      senderId,
      receiverId,
      status: "PENDING",
    });

    if (!request) {
      return res.status(404).json({ 
        code: 0,
        message: "Không tìm thấy yêu cầu kết bạn" 
      });
    }

    // Xóa yêu cầu kết bạn
    await FriendRequestModel.findByIdAndDelete(request._id);

    // Xóa khỏi Redis cache nếu có
    const redisKey = `friend_requests:${receiverId}`;
    const cachedRequests = await redisClient.get(redisKey);
    
    if (cachedRequests) {
      const requests = JSON.parse(cachedRequests);
      const updatedRequests = requests.filter(
        req => req.id.toString() !== request.id.toString()
      );
      await redisClient.setEx(
        redisKey,
        3600,
        JSON.stringify(updatedRequests)
      );
    }

    // Emit socket event cho người nhận
    io.to(receiverId).emit('friendRequestCancelled', {
      requestId: request.id,
      senderId: senderId
    });

    return res.status(200).json({ 
      code: 1,
      message: "Đã hủy yêu cầu kết bạn",
      data: {
        requestId: request.id,
        senderId,
        receiverId
      }
    });

  } catch (error) {
    console.error("Error cancelling friend request:", error);
    return res.status(500).json({ 
      code: -1,
      message: "Lỗi server khi hủy yêu cầu kết bạn",
      error: error.message 
    });
  }
};

userController.updatePhone = async (req, res) => {
  const id = req.user.id;
  const { phone } = req.body;

  if (!phone) {
    return res
      .status(400)
      .json({ message: "Số điện thoại không được để trống" });
  }

  const user = await UserModel.get(id);

  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }

  user.phone = phone;
  user.updatedAt = new Date().toString();

  await user.save();

  return res.status(200).json({
    message: "Cập nhật số điện thoại thành công",
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
    },
  });
};

userController.findUserByText = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        code: 0,
        message: "Vui lòng nhập từ khóa tìm kiếm" 
      });
    }

    // Tạo regex pattern cho tìm kiếm tương đối
    const searchPattern = new RegExp(text, "i");

    // Tìm kiếm song song theo cả fullname và phone
    const users = await UserModel.find({
      $or: [
      { fullname: searchPattern },
      { phone: searchPattern },
      { email: searchPattern }
      ]
    }, { _id: 0, id: 1, fullname: 1, urlavatar: 1, phone: 1, email: 1 });

    if (!users || users.length === 0) {
      return res.status(404).json({ 
        code: 0,
        message: "Không tìm thấy người dùng" 
      });
    }

    // Loại bỏ trùng lặp nếu có
    const uniqueUsers = users.filter((user, index, self) =>
      index === self.findIndex((u) => u.id === user.id)
    );

    return res.status(200).json({
      code: 1,
      message: "Tìm kiếm thành công",
      data: uniqueUsers
    });

  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({
      code: -1,
      message: "Lỗi server khi tìm kiếm",
      error: error.message
    });
  }
};

userController.getUserById = async (req, res) => {
  const id = req.params.id;

  try {
    const user = await UserModel.get(id); 

    if (!user) {
      return res.status(404).json({ message: "không tìm thấy người dùng" });
    }

    const dataReturn = {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      urlavatar: user.urlavatar,
      birthday: user.birthday,
      bio: user.bio,
      phone: user.phone,
      coverPhoto: user.coverPhoto,
      ismale: user.ismale,
    }

    res.status(200).json(dataReturn);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server không thể lấy người dùng" });
  }
};

module.exports = userController;
