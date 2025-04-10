const mongoose = require('mongoose');
const { Schema } = mongoose;

// Tin nhắn thực sự
const MessageDetailSchema = new Schema({
    idMessage: {
        type: String,
        required: true,
        index: true
    },
    idSender: String,
    idReceiver: String,
    idConversation: String,
    type: String,
    content: String,
    dateTime: {
        type: String,
        default: () => new Date().toISOString()
    },
    isRead: {
        type: Boolean,
        default: false
    },
    isRecall: {
        type: Boolean,
        default: false
    },
    isReply: {
        type: Boolean,
        default: false
    },
    isFoward: {
        type: Boolean,
        default: false
    },
    isRemove: {
        type: Boolean,
        default: false
    },
    idMessageReply: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

const MessageDetail = mongoose.model('MessageDetail', MessageDetailSchema);

module.exports = MessageDetail;
