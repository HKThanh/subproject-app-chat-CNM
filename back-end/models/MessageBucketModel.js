const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageBucketSchema = new Schema({
    IDBucketMessage: {
        type: String,
        required: true,
        index: true
    },
    listIDMessageDetail: {
        type: [String],
        default: []
    },
    IDNextBucket: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

const MessageBucket = mongoose.model('MessageBucket', MessageBucketSchema);

module.exports = MessageBucket;
