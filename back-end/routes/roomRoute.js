const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { createDailyRoom } = require('../services/dailyService');
const callController = require('../controllers/callController');

router.post('/create-room', authMiddleware, async (req, res) => {
    try {
        const room = await createDailyRoom();
        res.json({ roomUrl: room.url, roomName: room.name });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// API để khởi tạo cuộc gọi
router.post('/initiate-call', authMiddleware, async (req, res) => {
    try {
        const { receiverId, callType = 'video' } = req.body;
        const call = await callController.initiateCall(req.user.id, receiverId, callType);
        res.json({
            success: true,
            call: call
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// API để lấy lịch sử cuộc gọi
router.get('/call-history', authMiddleware, async (req, res) => {
    try {
        const { limit = 20, skip = 0 } = req.query;
        const history = await callController.getCallHistory(req.user.id, parseInt(limit), parseInt(skip));
        res.json({
            success: true,
            history: history
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// API để lấy cuộc gọi đang active
router.get('/active-call', authMiddleware, async (req, res) => {
    try {
        const activeCall = callController.getActiveCall(req.user.id);
        res.json({
            success: true,
            activeCall: activeCall
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

router.get('/call-status', authMiddleware, async (req, res) => {
    try {
        const activeCall = callController.getActiveCall(req.user.id);
        const userCallId = callController.getUserCall(req.user.id);
        
        res.json({
            success: true,
            hasActiveCall: !!activeCall,
            activeCall: activeCall,
            userCallId: userCallId
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

module.exports = router;