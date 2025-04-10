const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const authRoutes = (io) => {

    router.post('/verify-email-and-phone', authController.verifyEmailandPhone);

    router.post('/verify-otp', authController.verifyOTP);

    router.post('/register-phone', authController.verifyForPhone);

    router.post('/request-otp-web', authController.requestOTPForWeb);

    router.post('/register-web', authController.registerForWeb);

    router.post('/login', (req, res) => authController.login(req, res, io));

    router.post('/logout/:platform', authMiddleware, authController.logout);

    router.post('/refresh-token', authController.refreshToken);

    router.post('/reset-password/:id', userController.resetPassword);

    router.post('/reset-password-request', userController.resetPasswordRequest);

    router.post('/update-password', authMiddleware, userController.updatePassword);

    return router;
}

module.exports = authRoutes;