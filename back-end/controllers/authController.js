require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_REFRESH } = process.env;
const { v4: uuidv4 } = require("uuid");
const qrcode = require('qrcode');

const UserModel = require('../models/UserModel');
const redisClient = require('../services/redisClient');
const { generateOTP, sendOTP } = require('../services/otpServices');

const authController = {};

const pendingLogins = new Map();

authController.requestOTP = async (req, res) => {
    const { phone } = req.body;

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

authController.verifyOTP = async (req, res) => {
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

authController.register = async (req, res) => {
    const { phone, password, fullname } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ message: 'Hãy nhập cả số điện thoại và mật khẩu' });
    }

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
                password: hash,
                fullname: fullname,
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

authController.login = async (req, res) => {
    const { phone, password } = req.body;
    const { authorization } = req.headers;


    if (!phone || !password) {
        return res.status(400).json({ message: 'Hãy nhập cả sdt và mật khẩu' });
    }

    const user = await UserModel.get(phone);
    if (!user) {
        return res.status(400).json({ message: 'Sai tên đăng nhập' });
    }

    bcrypt.compare(password, user.password, async (err, result) => {
        if (result) {
            const data = {
                fullname: user.fullname,
                urlavatar: user.urlavatar,
                birthday: user.birthday,
                createdAt: user.createdAt,
            }

            const tokenInRedis = await redisClient.get(user.phone);
            if (!tokenInRedis) {
                
                const JWT_SECRET = process.env.JWT_SECRET;
                const JWT_REFRESH_SECRET = process.env.JWT_REFRESH;
                const token = jwt.sign({ phone: user.phone }, JWT_SECRET, { expiresIn: '30m' });
                const refreshToken = jwt.sign({ phone: user.phone }, JWT_REFRESH_SECRET, { expiresIn: '1d' });

                // store token in redis
                redisClient.setEx(user.phone, 1800, token);
                redisClient.setEx(`${user.phone}-refresh`, 86400, refreshToken);
                
                user.isLoggedin = true;

                return res.status(200).json({ 
                    message: 'Đăng nhập thành công', 
                    accessToken: token,
                    refreshToken: refreshToken, 
                    user: data,
                });
            }

            const testToken = await redisClient.get(user.phone);
        } else {
            res.status(400).json({ message: 'Nhập sai mật khẩu' });
        }
    });
};

authController.refreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
    }

    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH;

    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }

        const token = jwt.sign({ phone: user.phone }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ accessToken: token });
    });
};

authController.logout = async (req, res) => {
    const { authorization } = req.headers;

    // check if user still login
    if (!authorization) {
        return res.status(401).json({ message: 'Authorization missed' });
    }

    const token = authorization.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const phone = decoded.phone;
        const user = await UserModel.get(phone);

        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }

        user.isLoggedin = false;
    
        // remove token from redis
        await redisClient.del(phone);
    
        // remove refresh token from redis
        await redisClient.del(`${phone}-refresh`);
    
        res.status(200).json({ message: 'Bạn đã đăng xuất' });
    } catch (err) {
        return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
};

authController.generateQR = async (req, res, io, socket) => {
    const tempToken = jwt.sign({socketId: socket.id}, JWT_SECRET, { expiresIn: '5m' });
    pendingLogins.set(tempToken, socket.id);
    console.log('Pending logins: ', pendingLogins);

    try {
        const qrURL = await qrcode.toDataURL(tempToken);
        socket.emit('qrCode', qrURL);
    } catch (err) {
        console.error('Error generating QR code: ', err);
        socket.emit('error', { message: 'Không thể tạo mã QR' });
    }
}

authController.verifyToken = async (io, socket, data) => {
    const { qrToken, mobileToken } = data;
    const socketId = pendingLogins.get(qrToken);

    if (!socketId || !mobileToken) {
        socket.emit('loginFailed', { message: 'Mã QR đã hết hạn' });
        return;
    }

    try {
        const qrDecoded = jwt.verify(qrToken, JWT_SECRET);
        if (qrDecoded.socketId !== socket.id) {
            socket.emit('loginFailed', { message: 'Mã QR không hợp lệ' });
            return;
        }

        const mobileDecoded = jwt.verify(mobileToken, JWT_SECRET);
        const user = await UserModel.get(mobileDecoded.phone);

        if (!user) {
            socket.emit('loginFailed', { message: 'Người dùng không tồn tại' });
            return;
        } 

        const token = jwt.sign({ phone: user.phone }, JWT_SECRET, { expiresIn: '30m' });
        const refreshToken = jwt.sign({ phone: user.phone }, JWT_REFRESH_SECRET, { expiresIn: '1d' });

        // store token in redis
        redisClient.setEx(user.phone, 1800, token);
        redisClient.setEx(`${user.phone}-refresh`, 86400, refreshToken);

        io.to(socketId).emit('loginSuccess', {
            message: 'Đăng nhập thành công',
            accessToken: token,
            refreshToken: refreshToken,
        });
    } catch (err) {
        console.error('Error verifying token: ', err);
        socket.emit('loginFailed', { message: 'Xác thực thất bại' });
    }
}   

module.exports = authController;