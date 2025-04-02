const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const userController = require('../controllers/userController');

router.post('/request-otp', userController.requestOTP);

router.post('/verify-otp', userController.verifyOTP);

router.post('/register', userController.register);

router.post('/login', userController.login);

router.post('/refresh-token', userController.refreshToken);

module.exports = router;