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

    if (!oldpassword || !repassword || !newPassword) {
        return res.status(400).json({ message: 'Hãy nhập cả mật khẩu cũ và mới' });
    }

    const user = await UserModel.get(phone);

    if (oldpassword !== user.password) {
        return res.status(400).json({ message: 'Sai mật khẩu cũ' });
    }

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
        }
    });
}

module.exports = userController;