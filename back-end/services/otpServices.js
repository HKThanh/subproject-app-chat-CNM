const nodemailer = require('nodemailer');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // OTP 6 chữ số
};

const sendOTP = async (phone, otp) => {
    return otp;
};

module.exports = { generateOTP, sendOTP };