const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema({
    IDConversation: {
        type: String,
        required: true,
        index: true
    },
    IDNewestBucket: String
}, {
    timestamps: true
});

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;
