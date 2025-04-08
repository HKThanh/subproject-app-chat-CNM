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
    const { phone, email } = req.body;

    if (!phone) {
        return res.status(400).json({ message: 'Hãy nhập số điện thoại' });
    }

    const existingUser = await UserModel.get(phone);
    if (existingUser) {
        return res.status(400).json({ message: 'Số điện thoại đã tồn tại' });
    }

    const otp = generateOTP();

    try {
        await sendOTP(email, otp);
        await redisClient.setEx(phone, 300, JSON.stringify({ otp }));
        res.status(200).json({ message: 'OTP sent successfully', otp: otp });
    } catch (error) {
        res.status(500).json({ message: 'Failed to send OTP' });
    }
}

authController.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: 'Hãy nhập OTP' });
    }

    const storedData = await redisClient.get(email);

    if (!storedData) {
        await redisClient.del(email); // Remove expired OTP from Redis
        await UserModel.deleteOne({ email: email });

        // const user = await UserModel.scan({email: email}).exec();

        // if (user) {
        //     await user.delele();
        // }
        return res.status(400).json({ message: 'OTP đã hết hạn' });
    }

    const { otp: storedOtp } = JSON.parse(storedData);
    if (storedOtp !== otp) {
        return res.status(400).json({ message: 'Nhập sai OTP' });
    } else {
        //const user = await UserModel.scan({email: email}).exec();
        const user = await UserModel.findOne({email: email});
        if (!user) {
            return res.status(400).json({ message: 'Email không tồn tại', status: 400});
        }

        user.isVerified = true;
        await user.save();

        await redisClient.del(email); // Remove OTP from Redis after verification
        res.status(200).json({ message: 'OTP verified successfully', email: email });
    }

    res.status(200).json({ message: 'OTP verified', email: email });
};

authController.register = async (req, res) => {
    const { phone, password, fullname, email } = req.body;

    if (!phone || !password || !fullname || !email) {
        return res.status(400).json({ message: 'Hãy nhập thông tin cần thiết' });
    }

    // const existingUser = await UserModel.scan({phone: phone}).exec();
    const existingUser = await UserModel.get(phone);
    if (existingUser) {
        return res.status(400).json({ message: 'Tài khoản đã có người đăng ký' });
    }

    // Check if the email is already registered
    const existingEmail = await UserModel.findOne({ email: email });
    // write with dynamodb
    // const existingEmail = await UserModel.scan({email: email}).exec();

    if (existingEmail) {
        return res.status(400).json({ message: 'Email đã được sử dụng' });
    }

    bcrypt.hash(password, 10).then(async (hash) => {
        try {
            const newUser = await UserModel.create({
                id: () => uuidv4(),
                username: phone,
                phone: phone,
                password: hash,
                fullname: fullname,
                email: email,
                isVerified: false,
            });
            res.status(200).json({ phone: newUser.phone });

            // Send OTP to the user's email
            const otp = generateOTP();

            try {
                await sendOTP(email, otp);
                await redisClient.setEx(email, 300, JSON.stringify({ otp }));
                res.status(200).json({ message: 'OTP sent successfully', otp: otp });
            } catch (error) {
                res.status(500).json({ message: 'Failed to send OTP' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to create user' });
        }
    });
};

authController.login = async (req, res) => {
    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ message: 'Hãy nhập cả sdt và mật khẩu' });
    }

    // const user = await UserModel.scan("phone").contains(phone).exec();
    
    const user = await UserModel.findOne({phone: phone});
    if (!user) {
        return res.status(400).json({ message: 'Sai tên đăng nhập' });
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
                phone: user.phone,
            }

            const tokenInRedis = await redisClient.get(user.phone);
            if (!tokenInRedis) {

                const JWT_SECRET = process.env.JWT_SECRET;
                const JWT_REFRESH_SECRET = process.env.JWT_REFRESH;
                const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30m' });
                const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '1d' });

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
            } else {
                const decoded = jwt.verify(tokenInRedis, JWT_SECRET);
                if (decoded.id !== user.id) {
                    return res.status(401).json({ message: 'Token không hợp lệ' });
                }

                // check if user is logged in
                if (user.isLoggedin) {
                    return res.status(400).json({ message: 'Người dùng đã đăng nhập' });
                }

                user.isLoggedin = true;

                return res.status(200).json({
                    message: 'Đăng nhập thành công',
                    accessToken: tokenInRedis,
                    refreshToken: tokenInRedis,
                    user: data,
                });
            }
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

        // remove token from redis
        await redisClient.del(user.phone);

        // remove refresh token from redis
        await redisClient.del(`${user.phone}-refresh`);

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
        const user = await UserModel.get(mobileDecoded.phone);

        if (!user) {
            socket.emit('loginFailed', { message: 'Người dùng không tồn tại' });
            return;
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30m' });
        const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '1d' });

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