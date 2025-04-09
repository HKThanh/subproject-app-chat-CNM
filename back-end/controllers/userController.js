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
  const id = req.user.id;

  try {
    const user = await UserModel.get(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.status(200).json(user)
  } catch (error) {
    res.status(500).json({ message: "Failed to get user" })
  }
}

userController.resetPasswordRequest = async (req, res) => {
  const { email, phone } = req.body;

  const user = await UserModel.findOne({ email, phone })
  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" })
  }

  const otp = generateOTP();

  try {
    await sendOTP(email, otp);
    const idForRedis = uuidv4();
    const data = JSON.stringify({ otp, phone, email });

    await redisClient.setEx(idForRedis, 300, data); // Set OTP with 5 minutes expiration
    res.status(200).json({ message: 'OTP sent successfully', otp: otp, id: idForRedis });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send OTP' });
  }
}

userController.resetPassword = async (req, res) => {
  const { otp, password } = req.body;
  const idForRedis = req.params.id;

  const redisData = await redisClient.get(idForRedis);
  if (!redisData) {
    return res.status(400).json({ message: "OTP đã hết hạn" })
  }

  const { otp: storedOtp, phone: storedPhone, email: storedEmail } = JSON.parse(redisData);

  if (otp !== storedOtp) {
    return res.status(400).json({ message: "Sai mã OTP" })
  }
  const user = await UserModel.findOne({ email: storedEmail, phone: storedPhone })

  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" })
  }

  bcrypt.hash(password, 10, async (err, hash) => {

    user.password = hash
    await user.save()

    res.status(200).json({ message: "Cập nhật mật khẩu thành công" , newpass: user.password});
  });
}

userController.updatePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const id = req.user.id;

  const user = await UserModel.get(id)

  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" })
  }

  bcrypt.compare(oldPassword, user.password, async (err, result) => {
    if (!result) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" })
    }
  });

  bcrypt.hash(newPassword, 10, async (err, hash) => {
    if (newPassword === oldPassword) {
      return res.status(400).json({ message: "Mật khẩu mới không được giống mật khẩu cũ" })
    }

    user.password = hash
    await user.save()

    return res.status(200).json({ message: "Cập nhật mật khẩu thành công" })
  })
}

userController.updateAvatar = async (req, res) => {
  try {
    const id = req.user.id
    const fileUrl = req.body.fileUrl
    console.log(req.body)

    if (!fileUrl) {
      return res.status(400).json({ message: "File avatar không được để trống" })
    }

    const user = await UserModel.get(id)

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    user.urlavatar = fileUrl // Lưu URL từ S3
    user.updatedAt = new Date().toString()

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
    const id = req.user.id
    const { fullname, ismale, birthday } = req.body
    console.log(phone, fullname, ismale, birthday)
    if (!fullname && ismale === undefined && !birthday) {
      return res.status(400).json({ message: "Cần cung cấp ít nhất một thông tin để cập nhật" })
    }

    const user = await UserModel.get(id)

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    if (fullname) user.fullname = fullname
    if (ismale !== undefined) user.ismale = Boolean(ismale)
    if (birthday) user.birthday = birthday

    user.updatedAt = new Date().toString()

    await user.save()
    console.log("check user >>>. ", user);

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
        ismale: user.ismale
      },
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return res.status(500).json({ message: "Lỗi khi cập nhật thông tin" })
  }
}

userController.sendFriendRequest = async (req, res) => {
  const senderId = req.user.id;
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
    await userController.addToFriendList(request.senderId, request.receiverId);
  }

  if (type === "DECLINED") {
    await FriendRequestModel.updateOne({ id: id }, { status: "DECLINED" });
    // await FriendRequestModel.update({ id: id }, { status: "DECLINED" }).exec();
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
  try {
    const phone = req.user.phone
    const friendRequests = await FriendRequestModel.find({ receiverId: phone, status: "PENDING" })
    const requestsWithSenderInfo = await Promise.all(
      friendRequests.map(async (request) => {
        const sender = await UserModel.get(request.senderId)
        return { ...request.toObject(), sender }
      }),
    )
    res.status(200).json(requestsWithSenderInfo)
  } catch (error) {
    console.error("Error fetching friend requests:", error)
    res.status(500).json({ message: "Failed to fetch friend requests" })
  }
};

userController.updateBio = async (req, res) => {
  try {
    const id = req.user.id
    const { bio } = req.body

    if (!bio && bio !== "") {
      return res.status(400).json({ message: "Bio không được để trống" })
    }

    const user = await UserModel.get(id)

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    user.bio = bio
    user.updatedAt = new Date().toString()

    await user.save()

    return res.status(200).json({
      message: "Cập nhật bio thành công",
      user: {
        id: user.id,
        phone: user.phone,
        bio: user.bio,
      },
    })
  } catch (error) {
    console.error("Error updating bio:", error)
    return res.status(500).json({ message: "Lỗi khi cập nhật bio" })
  }
}

userController.updateCoverPhoto = async (req, res) => {
  try {
    const id = req.user.id
    const fileUrl = req.body.fileUrl

    if (!fileUrl) {
      return res.status(400).json({ message: "Cover photo không được để trống" })
    }

    const user = await UserModel.get(id)

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" })
    }

    user.coverPhoto = fileUrl
    user.updatedAt = new Date().toString()

    await user.save()

    return res.status(200).json({
      message: "Cập nhật cover photo thành công",
      user: {
        id: user.id,
        phone: user.phone,
        coverPhoto: user.coverPhoto,
      },
    })
  } catch (error) {
    console.error("Error updating cover photo:", error)
    return res.status(500).json({ message: "Lỗi khi cập nhật cover photo" })
  }
}

userController.cancelFriendRequest = async (req, res) => {
  const senderId = req.user.id;
  const { receiverId } = req.params;


  try {
    // const request = await FriendRequestModel.scan({
    //   senderId,
    //   receiverId,
    //   status: "PENDING",
    // }).exec();

    const request = await FriendRequestModel.findOne({
      senderId,
      receiverId,
      status: "PENDING",
    })

    // if (request.length === 0) {
    //   return res.status(404).json({ message: "No pending request found" });
    // }

    await FriendRequestModel.delete(request[0].id);
    return res.json({ message: "Friend request cancelled successfully" });
  } catch (e) {
    return res.status(500).json({ message: "Server error", error: e });
  }
};
module.exports = userController

