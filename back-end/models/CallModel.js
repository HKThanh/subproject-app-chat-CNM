const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
    idCall: {
        type: String,
        required: true,
        unique: true
    },
    callerId: {
        type: String,
        required: true
    },
    receiverId: {
        type: String,
        required: true
    },
    callType: {
        type: String,
        enum: ['video', 'audio'],
        default: 'video'
    },
    status: {
        type: String,
        enum: ['ringing', 'active', 'ended', 'rejected', 'missed'],
        default: 'ringing'
    },
    roomName: {
        type: String,
        required: true
    },
    roomUrl: {
        type: String,
        required: true
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date,
        default: null
    },
    duration: {
        type: Number, // in seconds
        default: 0
    },
    endReason: {
        type: String,
        enum: ['normal', 'rejected', 'missed', 'disconnected', 'error'],
        default: 'normal'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Call', callSchema);