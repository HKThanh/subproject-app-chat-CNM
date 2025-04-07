require("dotenv").config()
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { JWT_SECRET } = process.env
const { v4: uuidv4 } = require("uuid")
const qrcode = require("qrcode")

const UserModel = require("../models/UserModel")
const FriendRequestModel = require("../models/FriendRequestModel")
const redisClient = require("../services/redisClient")
const { generateOTP, sendOTP } = require("../services/otpServices")
const fileService = require("../services/fileService")

const userController = {}

userController.getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find()
    res.status(200).json(users)
  } catch (error) {
    res.status(500).json({ message: "Failed to get users" })
  }
}

userController.getUserByPhone = async (req, res) => {
  const { phone } = req.params
  try {
    const user = await UserModel.get(phone)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.status(200).json(user)
  } catch (error) {
    res.status(500).json({ message: "Failed to get user" })
  }
}

userController.updatePassword = async (req, res) => {
  const { phone, oldpassword, repassword, newPassword } = req.body

  if (!oldpassword || !repassword || !newPassword) {
    return res.status(400).json({ message: "Hãy nhập cả mật khẩu cũ và mới" })
  }

  const user = await UserModel.get(phone)

  if (oldpassword !== user.password) {
    return res.status(400).json({ message: "Sai mật khẩu cũ" })
  }

  if (newPassword !== repassword) {
    return res.status(400).json({ message: "Nhập lại sai mật khẩu" })
  }

  bcrypt.hash(newPassword, 10).then(async (hash) => {
    try {
      user.password = hash
      // update password using mongoose
      user.save()
      res.status(200).json({ message: "Cập nhật mật khẩu thành công" })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Cập nhật mật khẩu thất bại" })
    }
  })
}

userController.updateAvatar = async (req, res) => {
    try {
      const { phone } = req.params
      const { urlavatar } = req.body
      
      if (!urlavatar) {
        return res.status(400).json({ message: "URL avatar không được để trống" })
      }
  
      const user = await UserModel.get(phone)
  
      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng" })
      }
  
      // Cập nhật avatar và thời gian cập nhật
      user.urlavatar = urlavatar
      user.updatedAt = new Date()
  
      await user.save()
  
      return res.status(200).json({
        message: "Cập nhật avatar thành công",
        user: {
          id: user.id,
          phone: user.phone,
          urlavatar: user.urlavatar,
        },
      })
    } catch (error) {
      console.error("Error updating avatar:", error)
      return res.status(500).json({ message: "Lỗi khi cập nhật avatar" })
    }
  }

userController.updateProfile = async (req, res) => {
  try {
    const { phone } = req.params
    const { fullname, ismale, birthday } = req.body

    // Validate input
    if (!fullname && ismale === undefined && !birthday) {
      return res.status(400).json({ message: "Cần cung cấp ít nhất một thông tin để cập nhật" })
    }

    const user = await UserModel.get(phone)

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    // Update only allowed fields
    if (fullname) user.fullname = fullname
    if (ismale !== undefined) user.ismale = ismale
    if (birthday) user.birthday = birthday

    // Update timestamp
    user.updatedAt = new Date()

    await user.save()

    return res.status(200).json({
      message: "Cập nhật thông tin thành công",
      user: {
        id: user.id,
        fullname: user.fullname,
        ismale: user.ismale,
        birthday: user.birthday,
        phone: user.phone
      },
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return res.status(500).json({ message: "Lỗi khi cập nhật thông tin" })
  }
}

userController.sendFriendRequest = async (req, res) => {
  const senderId = req.user.phone;
  const { receiverId } = req.body;

  if (senderId === receiverId) {
    return res.status(400).json({ code: -2, message: "Gửi cho bản thân làm gì" });
  }

  const existing = await FriendRequestModel.findOne({ senderId, receiverId });

  // const existing = await FriendRequestModel.scan({
  //   senderId,
  //   receiverId,
  // }).exec();

  // if (existing.length > 0) {
  //   if (existing[0].status === "ACCEPTED") {
  //     return res.json({ code: 2, message: "Already friends" });
  //   }
  //   return res.json({ code: 0, message: "Request already sent" });
  // }

  // const newRequest = new FriendRequestModel({
  //   id: uuidv4(),
  //   senderId,
  //   receiverId,
  //   status: "PENDING",
  // });

  // await newRequest.save();

  if (existing) {
    if (existing.status === "ACCEPTED") {
      return res.json({ code: 2, message: "Hai bạn đã kết bạn" });
    }
    return res.json({ code: 0, message: "Yêu cầu đã được gửi" });
  }

  await FriendRequestModel.create({ senderId, receiverId, status: "PENDING" });
  return res.json({ code: 1, message: "Request sent", data: { senderId, receiverId } });
};

userController.handleFriendRequest = async (req, res) => {
  const { id, type } = req.body;

  // const requests = await FriendRequestModel.scan({ id, status: "PENDING" }).exec();
  // if (requests.length === 0) {
  //   return res.json({ code: 0, message: "Không tìm thấy yêu cầu kết bạn" });
  // }

  // const request = requests[0];

  const request = await FriendRequestModel.findOne({ id: id, status: "PENDING" });
  if (!request) return res.json({ code: 0, message: "Không tìm thấy yêu cầu kết bạn" });

  request.status = type;
  await request.save();

  if (type === "ACCEPTED") {
    await this.addToFriendList(request.senderId, request.receiverId);
  }

  return res.json({ code: 1, message: `Friend request ${type.toLowerCase()} successfully` });
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

userController.getAllFriendRequests = async (req, res) => {
  const receiverId = req.user.phone;
  const requests = await FriendRequestModel.find({ receiverId, status: "PENDING" });
  // const requests = await FriendRequestModel.scan({ receiverId, status: "PENDING" }).exec();

  for (let req of requests) {
    req.sender = await User.findById(req.senderId);
  }

  res.json(requests);
};

module.exports = userController