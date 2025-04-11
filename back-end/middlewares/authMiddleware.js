const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    console.log(token);
    

    if (!token) {
        return res.status(401).json({ message: 'Bạn đã hết phiên đăng nhập' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await UserModel.get(decoded.id);

        console.log('Decoded token:', decoded);
        console.log('User from token:', user);
        
        
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Auth error:', err);
        res.status(403).json({ message: 'Token đã hết hạn' });
    }
};

module.exports = authenticateToken;