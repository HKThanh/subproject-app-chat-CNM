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

authController.verifyEmailandPhone = async (req, res) => {
    const { email, phone } = req.body;

    if (!email || !phone) {
        return res.status(400).json({ message: 'Hãy nhập email và số điện thoại' });
    }

    const user = await UserModel.findOne({ email: email, phone: phone });
    if (user) {
        return res.status(400).json({ message: 'Email hoặc số điện thoại đã tồn tại' });
    }

    return res.status(200).json({ message: 'Email và số điện thoại hợp lệ', phone: phone, email: email });
}

authController.verifyForPhone = async (req, res) => {
    const { password, fullname, email, phone } = req.body;

    if (!password || !fullname || !email || !phone) {
        return res.status(400).json({ message: 'Hãy nhập thông tin cần thiết' });
    }

    bcrypt.hash(password, 10).then(async (hash) => {
        try {
            const newUser = await UserModel.create({
                id: uuidv4(),
                username: phone,
                phone: phone,
                password: hash,
                fullname: fullname,
                email: email,
                isVerified: false,
            });
            // Send OTP to the user's email
            const otp = generateOTP();

            await sendOTP(phone, otp);
            await redisClient.setEx(phone, 300, JSON.stringify({ otp }));
            return res.status(200).json({ 
                message: 'OTP đã được gửi đến email của bạn',
                email: newUser.email,
                otp: otp 
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to create user' });
        }
    });
};

authController.verifyOTP = async (req, res) => {
    const { otp, phone } = req.body;

    const cachedData = await redisClient.get(phone);

    if (!cachedData) {
        return res.status(400).json({ message: 'OTP đã hết hạn' });
    }

    const { otp: cachedOTP } = JSON.parse(cachedData);
    if (otp !== cachedOTP) {
        return res.status(400).json({ message: 'OTP không hợp lệ' });
    }

    const user = await UserModel.findOne({ phone: phone });

    if (!user) {
        return res.status(400).json({ message: 'Người dùng không tồn tại' });
    }

    user.isVerified = true;
    await user.save();
    await redisClient.del(phone); // Remove OTP from Redis after successful verification

    return res.status(200).json({ message: 'Xác thực thành công' , phone: phone});
}

authController.requestOTPForWeb = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Hãy nhập email' });
    }

    const user = await UserModel.findOne({ email: email });
    if (user) {
        return res.status(400).json({ message: 'Người dùng đã tồn tại' });
    }

    const otp = generateOTP();
    await sendOTP(email, otp);
    await redisClient.setEx(email, 300, JSON.stringify({ otp }));
    return res.status(200).json({ message: 'OTP đã được gửi đến email của bạn', email: email, otp: otp });
}

authController.registerForWeb = async (req, res) => {
    const { password, fullname, email, otp } = req.body;

    if (!password || !fullname || !email || !otp) {
        return res.status(400).json({ message: 'Hãy nhập thông tin cần thiết' });
    }

    const cachedData = await redisClient.get(email);
    if (!cachedData) {
        return res.status(400).json({ message: 'OTP đã hết hạn' });
    }

    const { otp: cachedOTP } = JSON.parse(cachedData);
    if (otp !== cachedOTP) {
        return res.status(400).json({ message: 'OTP không hợp lệ' });
    }

    brypt.hash(password, 10).then(async (hash) => {
        try {
            const newUser = await UserModel.create({
                id: uuidv4(),
                username: email,
                password: hash,
                fullname: fullname,
                email: email,
                isVerified: true,
            });
            await redisClient.del(email); // Remove OTP from Redis after successful verification
            return res.status(200).json({ message: 'Đăng ký thành công', email: email });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to create user' });
        }
    });
}

authController.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Hãy nhập cả email và mật khẩu' });
    }

    // const user = await UserModel.scan("email").contains(email).exec();

    const user = await UserModel.findOne({ email: email });
    if (!user) {
        return res.status(400).json({ message: 'Nhập sai email hoặc mật khẩu' });
    }
    bcrypt.compare(password, user.password, async (err, result) => {
        if (result) {
            const data = {
                id: user.id,
                fullname: user.fullname,
                urlavatar: user.urlavatar,
                birthday: user.birthday,
                createdAt: user.createdAt,
                email: user.email,
                bio: user.bio,
                phone: user.phone,
                coverPhoto: user.coverPhoto,
                ismale: user.ismale
            }

            if (!user.isLoggedin) {

                const JWT_SECRET = process.env.JWT_SECRET;
                const JWT_REFRESH_SECRET = process.env.JWT_REFRESH;
                const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30m' });
                const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '1d' });

                // store token in redis
                redisClient.setEx(user.email, 1800, token);
                redisClient.setEx(`${user.email}-refresh`, 86400, refreshToken);

                user.isLoggedin = true;
                await user.save();

                return res.status(200).json({
                    message: 'Đăng nhập thành công',
                    accessToken: token,
                    refreshToken: refreshToken,
                    user: data,
                });
            } else {
                return res.status(400).json({ message: 'Người dùng đang đăng nhập' });
            }
        } else {
            res.status(400).json({ message: 'Nhập sai email hoặc mật khẩu' });
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

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
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
        const id = decoded.id;
        const user = await UserModel.get(id);

        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }

        user.isLoggedin = false;
        await user.save();

        // remove token from redis
        await redisClient.del(user.email);

        // remove refresh token from redis
        await redisClient.del(`${user.email}-refresh`);

        res.status(200).json({ message: 'Bạn đã đăng xuất' });
    } catch (err) {
        return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
};

authController.generateQR = async (req, res, io, socket) => {
    const tempToken = jwt.sign({ socketId: socket.id }, JWT_SECRET, { expiresIn: '5m' });
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
        const user = await UserModel.get(mobileDecoded.id);

        if (!user) {
            socket.emit('loginFailed', { message: 'Người dùng không tồn tại' });
            return;
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30m' });
        const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '1d' });

        // store token in redis
        redisClient.setEx(user.email, 1800, token);
        redisClient.setEx(`${user.email}-refresh`, 86400, refreshToken);

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