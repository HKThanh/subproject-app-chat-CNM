const multer = require("multer")
const fileService = {}

const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Chỉ chấp nhận file hình ảnh"), false)
    }
}
  

fileService.uploadAvatar = multer({
    storage: multer.memoryStorage(), 
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: imageFileFilter,
})

fileService.processAvatar = (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file được tải lên" })
    }
  
    // Chuyển đổi file thành base64 để lưu trực tiếp vào database
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
    req.body.urlavatar = base64Image
  
    next()
}

module.exports = fileService