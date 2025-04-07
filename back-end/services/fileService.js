const multer = require("multer")
const s3  = require("../config/connectS3")
require("dotenv").config()
const fileService = {}

const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true)
  } else {
    cb(new Error("Chỉ chấp nhận file hình ảnh"), false)
  }
}

fileService.uploadFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFileFilter,
})

// Add this line after the fileService.uploadFile definition
fileService.uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFileFilter,
})

fileService.processAvatar = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: "Không có file được tải lên" })
  }

  /**
   * Chuyển đổi file thành base64 để lưu trực tiếp vào database
   * Phần này dành cho mongodb
   */
  // const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
  // req.body.fileUrl = base64Image

  // next()

  /***
   * Phần này là s3
   */
  const random = (num) =>
    `${Math.random()
      .toString(36)
      .substring(2, num + 2)}`

  const FILE_TYPE_ACTION = ["image/png", "image/jpeg", "image/jpg", "image/gif"]

  const filePath = `${random(4)}-${new Date().getTime()}-${req.file.originalname}`

  if (FILE_TYPE_ACTION.indexOf(req.file.mimetype) === -1) {
    return res.status(400).json({ message: `${req.file.originalname} is invalid` })
  }

  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Body: req.file.buffer,
    Key: filePath,
    ContentType: req.file.mimetype,
  }

  try {
    const data = await s3.upload(uploadParams).promise()
    const fileUrl = data.Location // URL của file trên S3
    req.body.fileUrl = fileUrl // Gán URL vào req.body.fileUrl để controller sử dụng
    next()
  } catch (error) {
    console.error("Error uploading to S3:", error)
    return res.status(500).json({ message: "Lỗi khi upload file lên S3" })
  }
}

module.exports = fileService

