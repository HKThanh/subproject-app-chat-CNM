const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const UserModel = require('../models/UserModel');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;
const { v4: uuidv4 } = require("uuid");
const { generateOTP, sendOTP } = require('../services/otpServices');
const { isErrored } = require('nodemailer/lib/xoauth2');
const redisClient = require('../services/redisClient');

const otpStore = {};

router.post('/request-otp', async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ message: 'Phone number is required' });
    }

    // Kiểm tra xem phone đã tồn tại chưa
    const existingUser = await UserModel.get(phone);
    if (existingUser) {
        return res.status(400).json({ message: 'Phone number already registered' });
    }

    const otp = generateOTP();

    try {
        await sendOTP(phone, otp);
        // Lưu OTP vào Redis với TTL 5 phút (300 giây)
        await redisClient.setEx(phone, 300, JSON.stringify({ otp }));
        res.status(200).json({ message: 'OTP sent successfully', otp: otp });
    } catch (error) {
        res.status(500).json({ message: 'Failed to send OTP' });
    }
});

router.post('/verify-otp', async (req, res) => {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
        return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    const storedData = await redisClient.get(phone);

    if (!storedData) {
        return res.status(400).json({ message: 'OTP expired or invalid' });
    }

    const { otp: storedOtp } = JSON.parse(storedData);
    if (storedOtp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
    }

    res.status(200).json({ message: 'OTP verified', phone: phone });
});

router.post('/register', async (req, res) => {
    const { username, password, repassword } = req.body;
    if (!username || !password) {
        return res
            .status(400)
            .json({ message: "Vui lòng cung cấp số điện thoại và password." });
    }

    if (password !== repassword) {
        return res.status(400).json({ message: "Mật khẩu không khớp" });
    }

    bcrypt.hash(password, 10).then(async (hash) => {
        try {
            const newUser = await UserModel.create({
                ID: uuidv4(),
                username: username,
                phone: username,
                password: hash,
            });
            res.status(200).json({username: newUser.username, password: password});
        } catch (error) {
            console.error(error);
            res.status(400).json("UserModel create user not success");
        }
    });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res
            .status(400)
            .json({ message: "Vui lòng cung cấp số điện thoại và password." });
    } 

    const myUser = await UserModel.get(username);
    if (!myUser) {
        return res.status(400).json("Username is not exist");
    } else {
        bcrypt.compare(password, myUser.password, (err, res2) => {
            if (res2) {
                res.status(200).json({
                    message: "Success",
                    data: myUser.phone,
                });
            } else res.status(400).json("The password is incorrect");
        });
    }
});

module.exports = router;