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

const checkEmailAndPhone = async (email, phone) => {
    const user = await UserModel.findOne({ 
        $or: [
            { email: email },
            { phone: phone }
        ]
    });
    return user;
}

authController.verifyEmailandPhone = async (req, res) => {
    const { email, phone } = req.body;

    if (!email || !phone) {
        return res.status(400).json({ message: 'Hãy nhập email và số điện thoại' });
    }

    const user = await checkEmailAndPhone(email, phone);
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
                username: email,
                phone: phone,
                password: hash,
                fullname: fullname,
                email: email,
                urlavatar: "https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg",
                coverPhoto: "https://cellphones.com.vn/sforum/wp-content/uploads/2023/07/hinh-nen-zalo-23-1.jpg",
                isVerified: false,
            });
            // Send OTP to the user's email

            const user = await UserModel.findOne({ email: email });

            const cachedData = await redisClient.get(email);
            if (cachedData && !user.isVerified) {
                await redisClient.del(email); // Remove old OTP if exists
            }

            const otp = generateOTP();
                await sendOTP(email, otp);
                await redisClient.setEx(email, 300, JSON.stringify({ otp }));

            console.log(otp);
            
            return res.status(200).json({ 
                message: 'OTP đã được gửi đến email của bạn',
                email: newUser.email,
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Lỗi tạo tài khoản' });
        }
    });
};

authController.verifyOTP = async (req, res) => {
    const { otp, email } = req.body;

    const cachedData = await redisClient.get(email);

    if (!cachedData) {
        return res.status(400).json({ message: 'OTP đã hết hạn' });
    }

    const { otp: cachedOTP } = JSON.parse(cachedData);
    if (otp !== cachedOTP) {
        return res.status(400).json({ message: 'OTP không hợp lệ' });
    }

    const user = await UserModel.findOne({ email: email });

    if (!user) {
        return res.status(400).json({ message: 'Người dùng không tồn tại' });
    }

    user.isVerified = true;
    await user.save();
    await redisClient.del(email); // Remove OTP from Redis after successful verification

    return res.status(200).json({ message: 'Xác thực thành công' , email: email });
}

authController.requestOTPForWeb = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Hãy nhập email' });
    }

    const user = await UserModel.findOne({ email: email });
    if (user && !user.isVerified) {
        redisClient.del(email); // Remove old OTP if exists
    }

    if (user) {
        return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    const otp = generateOTP();
    await sendOTP(email, otp);
    await redisClient.setEx(email, 300, JSON.stringify({ otp })); // Store OTP in Redis for 5 minutes

    console.log(otp);
    
    return res.status(200).json({ message: 'OTP đã được gửi đến email của bạn', email: email });
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
        return res.status(400).json({ message: 'OTP không hợp lệ', status: 401 });
    }

    bcrypt.hash(password, 10).then(async (hash) => {
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
            res.status(500).json({ message: 'Đã xảy ra lỗi khi tạo tài khoản' });
        }
    });
}

authController.login = async (req, res, io) => {
    const { email, password, platform } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Hãy nhập cả email và mật khẩu' });
    }

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
                ismale: user.ismale,
                friendList: user.friendList,
                isVerified: user.isVerified,
            }

            // Kiểm tra và quản lý đăng nhập theo platform
            const deviceKey = `${user.email}-${platform}`;
            const isLoggedIn = await redisClient.get(deviceKey);

            if (isLoggedIn) {
                // Emit force logout event to the previous session
                io.to(deviceKey).emit('forceLogout', {
                    platform,
                    message: 'Tài khoản của bạn đã đăng nhập ở thiết bị khác',
                });

                // Remove old session
                await Promise.all([
                    redisClient.del(deviceKey),
                    redisClient.del(`${deviceKey}-refresh`),
                ]);
                
            }

            const JWT_SECRET = process.env.JWT_SECRET;
            const JWT_REFRESH_SECRET = process.env.JWT_REFRESH;
            const token = jwt.sign({ 
                id: user.id,
                platform: platform 
            }, JWT_SECRET, { expiresIn: '30m' });
            
            const refreshToken = jwt.sign({ 
                id: user.id,
                platform: platform 
            }, JWT_REFRESH_SECRET, { expiresIn: '1d' });

            // Lưu token theo platform
            await redisClient.setEx(deviceKey, 1800, token);
            await redisClient.setEx(`${deviceKey}-refresh`, 86400, refreshToken);

            // Cập nhật trạng thái đăng nhập
            if (!user.isLoggedin) {
                user.isLoggedin = true;
                await user.save();

            }

            return res.status(200).json({
                message: 'Đăng nhập thành công',
                accessToken: token,
                refreshToken: refreshToken,
                user: data,
    
        });
        } else {
            res.status(400).json({ message: 'Nhập sai email hoặc mật khẩu' });
        }
    });
};
authController.refreshToken = async (req, res) => {
    const { refreshToken, platform } = req.body;

    if (!refreshToken || !platform) {
        return res.status(400).json({ 
            message: 'Refresh token and platform are required' 
        });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH;

    try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        const user = await UserModel.findOne({ id: decoded.id });

        if (!user) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }

        // Verify if refresh token exists in Redis
        const deviceKey = `${user.email}-${platform}`;
        const storedRefreshToken = await redisClient.get(`${deviceKey}-refresh`);

        if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
            return res.status(403).json({ 
                message: 'Invalid refresh token' 
            });
        }

        // Generate new tokens
        const newToken = jwt.sign({ 
            id: user.id,
            platform: platform 
        }, JWT_SECRET, { expiresIn: '30m' });

        const newRefreshToken = jwt.sign({ 
            id: user.id,
            platform: platform 
        }, JWT_REFRESH_SECRET, { expiresIn: '1d' });

        // Update tokens in Redis
        await redisClient.setEx(deviceKey, 1800, newToken);
        await redisClient.setEx(`${deviceKey}-refresh`, 86400, newRefreshToken);

        return res.status(200).json({
            accessToken: newToken,
            refreshToken: newRefreshToken
        });

    } catch (err) {
        return res.status(403).json({ 
            message: 'Invalid refresh token' 
        });
    }
};

authController.logout = async (req, res) => {
    const { authorization } = req.headers;
    const platform = req.params.platform;

    if (!authorization) {
        return res.status(401).json({ message: 'Authorization missed' });
    }

    if (!platform || !['web', 'mobile'].includes(platform)) {
        return res.status(400).json({ message: 'Platform không hợp lệ' });
    }

    const token = authorization.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const id = decoded.id;
        const user = await UserModel.get(id);

        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }

        const deviceKey = `${user.email}-${platform}`;
        
        // Xóa token theo platform
        await redisClient.del(deviceKey);
        await redisClient.del(`${deviceKey}-refresh`);

        // Kiểm tra nếu không còn đăng nhập ở platform nào
        const mobileKey = await redisClient.get(`${user.email}-mobile`);
        const webKey = await redisClient.get(`${user.email}-web`);

        if (!mobileKey && !webKey) {
            user.isLoggedin = false;
            await user.save();
        }

        res.status(200).json({ message: 'Bạn đã đăng xuất' });
    } catch (err) {
        return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
};

authController.generateQR = async (socket, io) => {
    const tempToken = jwt.sign({ socketId: socket.id }, JWT_SECRET, { expiresIn: '5m' });
    pendingLogins.set(tempToken, socket.id);
    console.log('Pending logins: ', pendingLogins);
    console.log('Temp token: ', tempToken);

    try {
        const qrURL = await qrcode.toDataURL(tempToken);
        // Gửi QR code đến client cụ thể thông qua socket.id
        io.to(socket.id).emit('qrCode', qrURL);
    } catch (err) {
        console.error('Error generating QR code: ', err);
        io.to(socket.id).emit('errorCreateQR', { message: 'Không thể tạo mã QR' });
    }
}

authController.verifyToken = async (io, socket, data) => {
    try {
        // Parse data if it's a string
        let parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        if (!parsedData || !parsedData.qrToken || !parsedData.mobileToken) {
            io.to(socket.id).emit('loginQRFailed', {
                message: 'Dữ liệu không hợp lệ hoặc thiếu thông tin'
            });
            return;
        }

        const { qrToken, mobileToken } = parsedData;
        const socketId = pendingLogins.get(qrToken);

        if (!socketId) {
            io.to(socket.id).emit('loginQRFailed', {
                message: 'Mã QR đã hết hạn hoặc không tồn tại'
            });
            return;
        }

        const qrDecoded = jwt.verify(qrToken, JWT_SECRET);
        if (qrDecoded.socketId !== socketId) {
            io.to(socket.id).emit('loginQRFailed', {
                message: 'Mã QR không hợp lệ'
            });
            return;
        }

        const mobileDecoded = jwt.verify(mobileToken, JWT_SECRET);
        const user = await UserModel.get(mobileDecoded.id);

        if (!user) {
            io.to(socket.id).emit('loginQRFailed', {
                message: 'Người dùng không tồn tại'
            });
            return;
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30m' });
        const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH, { expiresIn: '1d' });

        // store token in redis
        await redisClient.setEx(user.email, 1800, token);
        await redisClient.setEx(`${user.email}-refresh`, 86400, refreshToken);

        io.to(socketId).emit('loginQRSuccess', {
            message: 'Đăng nhập thành công',
            accessToken: token,
            refreshToken: refreshToken,
        });
    } catch (err) {
        console.error('Error in verifyToken:', err);
        io.to(socket.id).emit('loginQRFailed', {
            message: 'Xác thực thất bại',
            error: err.message
        });
    }
}

module.exports = authController;