const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/request-otp', authController.requestOTP);

router.post('/verify-otp', authController.verifyOTP);

router.post('/register', authController.register);

router.post('/login', authController.login);

router.post('/logout', authMiddleware, authController.logout);

router.post('/refresh-token', authController.refreshToken);

router.post('/update-password', userController.updatePassword);

router.post('/update-pass-request', userController.updatePasswordRequest);

module.exports = router;