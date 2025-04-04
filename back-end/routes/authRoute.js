const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const userController = require('../controllers/userController');
const authController = require('../controllers/authController')

router.post('/request-otp', authController.requestOTP);

router.post('/verify-otp', authController.verifyOTP);

router.post('/register', authController.register);

router.post('/login', authController.login);

router.post('/logout', authController.logout);

router.post('/refresh-token', authController.refreshToken);

router.post('/update-password', userController.updatePassword);

module.exports = router;