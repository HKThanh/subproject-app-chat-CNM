const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const fileService = require("../services/fileService");

// Route chỉ để upload file trong chat
router.post("/chat-file", 
    authMiddleware,
    fileService.uploadChatFile.single('file'),
    fileService.processChatFile,
    (req, res) => {
        res.json({
            success: true,
            fileUrl: req.fileUrl,
            fileType: req.body.fileType,
            fileName: req.file.originalname
        });
    }
);

// Error handling middleware
router.use((error, req, res, next) => {
    console.error("Upload error:", error);
    return res.status(500).json({
        success: false,
        message: error.message || 'Có lỗi xảy ra khi upload file'
    });
});

module.exports = router;