require("dotenv").config()
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { JWT_SECRET } = process.env
const { v4: uuidv4 } = require("uuid")
const qrcode = require("qrcode")

const UserModel = require("../models/UserModel")
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
      await user.save()
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
    const fileUrl = req.body.fileUrl
    console.log(req.body)

    if (!fileUrl) {
      return res.status(400).json({ message: "File avatar không được để trống" })
    }

    const user = await UserModel.get(phone)

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
    const { phone } = req.params
    const { fullname, ismale, birthday } = req.body
    console.log(phone, fullname, ismale, birthday)
    if (!fullname && ismale === undefined && !birthday) {
      return res.status(400).json({ message: "Cần cung cấp ít nhất một thông tin để cập nhật" })
    }

    const user = await UserModel.get(phone)
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

userController.updateBio = async (req, res) => {
  try {
    const { phone } = req.params
    const { bio } = req.body

    if (!bio && bio !== "") {
      return res.status(400).json({ message: "Bio không được để trống" })
    }

    const user = await UserModel.get(phone)

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
    const { phone } = req.params
    const fileUrl = req.body.fileUrl

    if (!fileUrl) {
      return res.status(400).json({ message: "Cover photo không được để trống" })
    }

    const user = await UserModel.get(phone)

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
module.exports = userController

