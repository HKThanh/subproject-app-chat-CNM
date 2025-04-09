const express = require('express');
const router = express.Router();
const MessageDetail = require('../models/MessageDetailModel');

// Đánh dấu một tin nhắn đã đọc
router.post('/mark-message-read', async (req, res) => {
    try {
        const { messageId } = req.body;
        
        const message = await MessageDetail.findOneAndUpdate(
            { idMessage: messageId },
            { isRead: true },
            { new: true }
        );

        if (!message) {
            return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
        }

        res.json({ 
            success: true, 
            message: 'Đã đánh dấu tin nhắn là đã đọc',
            data: message 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
});

// Đánh dấu tất cả tin nhắn trong conversation là đã đọc
router.post('/mark-messages-read', async (req, res) => {
    try {
        const { conversationId, receiverId } = req.body;
        
        const result = await MessageDetail.updateMany(
            {
                idConversation: conversationId,
                idReceiver: receiverId,
                isRead: false
            },
            { isRead: true }
        );

        res.json({ 
            success: true, 
            message: 'Đã đánh dấu tất cả tin nhắn là đã đọc',
            updatedCount: result.modifiedCount 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
});

// Lấy số lượng tin nhắn chưa đọc
router.get('/unread', async (req, res) => {
    try {
        const { userId } = req.query;
        
        const count = await MessageDetail.countDocuments({
            idReceiver: userId,
            isRead: false
        });

        res.json({ 
            success: true, 
            unreadCount: count 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
});

module.exports = router;