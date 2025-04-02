require('dotenv').config();
const UserModel = require('../models/UserModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;
const { v4: uuidv4 } = require("uuid");
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

userController.requestOTP = async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ message: 'Phone number is required' });
    }

    const existingUser = await UserModel.get(phone);
    if (existingUser) {
        return res.status(400).json({ message: 'Phone number already registered' });
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
};

userController.register = async (req, res) => {
    const { phone, password, repassword } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ message: 'Phone number and password are required' });
    }

    if (password !== repassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existingUser = await UserModel.get(phone);
    if (existingUser) {
        return res.status(400).json({ message: 'Phone number already registered' });
    }

    bcrypt.hash(password, 10).then(async (hash) => {
        try {
            const newUser = await UserModel.create({
                id: uuidv4(),
                phone: phone,
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
        return res.status(400).json({ message: 'Phone number and password are required' });
    }

    const user = await UserModel.get(phone);
    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }

    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            const JWT_SECRET = process.env.JWT_SECRET;
            const JWT_REFRESH_SECRET = process.env.JWT_REFRESH;
            const token = jwt.sign({ phone: user.phone }, JWT_SECRET, { expiresIn: '1h' });
            const refreshToken = jwt.sign({ phone: user.phone }, JWT_REFRESH_SECRET, { expiresIn: '1d' });
            res.status(200).json({ 
                message: 'Login successful', 
                accessToken: token,
                refreshToken: refreshToken, 
            });
        } else {
            res.status(400).json({ message: 'Invalid password' });
        }
    });
};

module.exports = userController;