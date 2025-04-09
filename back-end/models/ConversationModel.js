const mongoose = require('mongoose');
const moment = require('moment-timezone');
const { Schema } = mongoose;

const ConversationSchema = new Schema({
    idConversation: {
        type: String,
        required: true,
        unique: true
    },
    idSender: {
        type: String,
        required: true,
        index: true
    },
    isGroup: {
        type: Boolean,
        default: false
    },
    groupName: String,
    groupAvatar: String,
    idReceiver: String,
    idNewestMessage: String,
    isBlock: {
        type: Boolean,
        default: false
    },
    rules: {
        IDOwner: String,
        listIDCoOwner: [String]
    },
    groupMembers: {
        type: [String],
        default: []
    },
    listImage: {
        type: [String],
        default: []
    },
    listFile: {
        type: [String],
        default: []
    },
    lastChange: {
        type: String,
        default: () => moment.tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm:ss.SSS')
    }
}, {
    timestamps: true
});

// Thêm indexes để tối ưu queries
ConversationSchema.index({ idSender: 1, lastChange: -1 });
ConversationSchema.index({ groupMembers: 1 });

const Conversation = mongoose.model('Conversation', ConversationSchema);

module.exports = Conversation;
