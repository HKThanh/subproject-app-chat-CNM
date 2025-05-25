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
    type: {
        type: String,
        enum: ['text', 'image', 'video', 'file', 'sticker', 'link', 'audio', 'document', 'system', 'call'],
        default: 'text'
    },
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
    isForward: {
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
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    reactions: {
        type: Map,
        of: {
            reaction: String,        // Loại reaction (emoji)
            userReactions: [{        // Chi tiết reaction của từng người dùng
                userId: String,      // ID của người dùng
                count: Number        // Số lần người dùng này đã react
            }],
            totalCount: Number       // Tổng số lượng reaction của loại này
        },
        default: () => new Map([
            ['👍', { reaction: '👍', userReactions: [], totalCount: 0 }],
            ['❤️', { reaction: '❤️', userReactions: [], totalCount: 0 }],
            ['😂', { reaction: '😂', userReactions: [], totalCount: 0 }],
            ['😮', { reaction: '😮', userReactions: [], totalCount: 0 }],
            ['😢', { reaction: '😢', userReactions: [], totalCount: 0 }],
            ['😡', { reaction: '😡', userReactions: [], totalCount: 0 }]
        ])
    },
    mentionedUsers: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

const MessageDetail = mongoose.model('MessageDetail', MessageDetailSchema);

module.exports = MessageDetail;
