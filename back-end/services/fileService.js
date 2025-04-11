const multer = require("multer")
const s3  = require("../config/connectS3")
require("dotenv").config()
const fileService = {}

// func để lọc ra file hình ảnh
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true)
  } else {
    cb(new Error("Chỉ chấp nhận file hình ảnh"), false)
  }
}


// func lưu file vào memory
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

// Add new utility functions for chat files
fileService.chatFileFilter = (req, file, cb) => {
  const allowedTypes = {
    'image': ['image/jpeg', 'image/png', 'image/gif'],
    'video': ['video/mp4', 'video/quicktime'],
    'document': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };

  const fileType = req.body.fileType;
  if (!allowedTypes[fileType]?.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type for ${fileType}`), false);
  }
  cb(null, true);
};

fileService.uploadChatFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: fileService.chatFileFilter,
});

fileService.processChatFile = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const fileType = req.body.fileType;
  const bucketMap = {
    'image': 'imagetintin',
    'video': 'videotintin',
    'document': 'documenttintin'
  };

  const random = (num) => `${Math.random().toString(36).substring(2, num + 2)}`;
  const filePath = `${random(4)}-${new Date().getTime()}-${req.file.originalname}`;

  const uploadParams = {
    Bucket: bucketMap[fileType],
    Body: req.file.buffer,
    Key: filePath,
    ContentType: req.file.mimetype,
  };

  try {
    const data = await s3.upload(uploadParams).promise();
    req.fileUrl = data.Location;
    next();
  } catch (error) {
    console.error("Error uploading to S3:", error);
    return res.status(500).json({ message: "Error uploading file to S3" });
  }
};

// Hàm xử lí hình ảnh (để lưu hình vào db hoặc s3)
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
