require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;
const { v4: uuidv4 } = require("uuid");
const qrcode = require('qrcode');

const UserModel = require('../models/UserModel');
const redisClient = require('../services/redisClient');
const { generateOTP, sendOTP } = require('../services/otpServices');

const userController = {};

userController.getAllUsers = async (req, res) => {
    try {
        const users = await UserModel.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get users' });
    }
};

userController.getUserByPhone = async (req, res) => {
    const { phone } = req.params;
    try {
        const user = await UserModel.get(phone);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get user' });
    }
};

userController.updatePassword = async (req, res) => {
    const { phone, oldpassword, repassword, newPassword } = req.body;

<<<<<<< HEAD
    if (!phone) {
        return res.status(400).json({ message: 'Hãy nhập số điện thoại' });
    }

    const existingUser = await UserModel.get(phone);
    if (existingUser) {
        return res.status(400).json({ message: 'Số điện thoại đã tồn tại' });
    }

    const otp = generateOTP();

    try {
        await sendOTP(phone, otp);
        await redisClient.setEx(phone, 300, JSON.stringify({ otp }));
        res.status(200).json({ message: 'OTP sent successfully', otp: otp });
    } catch (error) {
        res.status(500).json({ message: 'Failed to send OTP' });
    }
}

userController.verifyOTP = async (req, res) => {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
        return res.status(400).json({ message: 'Hãy nhập OTP' });
    }

    const storedData = await redisClient.get(phone);

    if (!storedData) {
        return res.status(400).json({ message: 'OTP đã hết hạn' });
    }

    const { otp: storedOtp } = JSON.parse(storedData);
    if (storedOtp !== otp) {
        return res.status(400).json({ message: 'Nhập sai OTP' });
    }

    res.status(200).json({ message: 'OTP verified', phone: phone });
};

userController.register = async (req, res) => {
    const { phone, password, fullname } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ message: 'Hãy nhập cả số điện thoại và mật khẩu' });
    }

    // if (password !== repassword) {
    //     return res.status(400).json({ message: 'Nhập lại sai mật khẩu' });
    // }

    const existingUser = await UserModel.get(phone);
    if (existingUser) {
        return res.status(400).json({ message: 'Tài khoản đã có người đăng ký' });
    }

    bcrypt.hash(password, 10).then(async (hash) => {
        try {
            const newUser = await UserModel.create({
                id: uuidv4(),
                username: phone,
                phone: phone,
                fullname: fullname,
                password: hash,
            });
            res.status(200).json({ phone: newUser.phone });

            // delete OTP from redis
            await redisClient.del(phone);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to create user' });
        }
    });
};

userController.login = async (req, res) => {
    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ message: 'Hãy nhập cả sdt và mật khẩu' });
=======
    if (!oldpassword || !repassword || !newPassword) {
        return res.status(400).json({ message: 'Hãy nhập cả mật khẩu cũ và mới' });
>>>>>>> origin/main
    }

    const user = await UserModel.get(phone);

    if (oldpassword !== user.password) {
        return res.status(400).json({ message: 'Sai mật khẩu cũ' });
    }

<<<<<<< HEAD
    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            const JWT_SECRET = process.env.JWT_SECRET;
            const JWT_REFRESH_SECRET = process.env.JWT_REFRESH;
            const token = jwt.sign({ phone: user.phone }, JWT_SECRET, { expiresIn: '30m' });
            const refreshToken = jwt.sign({ phone: user.phone }, JWT_REFRESH_SECRET, { expiresIn: '1d' });
            res.status(200).json({ 
                message: 'Login successful', 
                accessToken: token,
                refreshToken: refreshToken, 
                user: {
                    id: user.id,
                    username: user.username,
                    phone: user.phone,
                    fullname: user.fullname,
                    
                }
            });
        } else {
            res.status(400).json({ message: 'Nhập sai password' });
=======
    if (newPassword !== repassword) {
        return res.status(400).json({ message: 'Nhập lại sai mật khẩu' });
    }

    bcrypt.hash(newPassword, 10).then(async (hash) => {
        try {
            user.password = hash;
            // update password using mongoose
            user.save();
            res.status(200).json({ message: 'Cập nhật mật khẩu thành công' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Cập nhật mật khẩu thất bại' });
>>>>>>> origin/main
        }
    });
}

module.exports = userController;