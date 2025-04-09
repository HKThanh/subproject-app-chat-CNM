const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config();
const axios = require('axios');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = new twilio(accountSid, authToken);

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // OTP 6 chữ số
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // your Gmail address
        pass: process.env.EMAIL_PASSWORD // your Gmail app password
    }
});

const sendOTP = async (email, otp) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP Code',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>OTP Verification</h2>
                    <p>Your OTP code is:</p>
                    <h1 style="color: #4CAF50;">${otp}</h1>
                    <p>This code will expire in 3 minutes.</p>
                    <p>If you didn't request this code, please ignore this email.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

module.exports = { generateOTP, sendOTP };