const dynamoose = require("dynamoose");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ConversationSchema = new Schema({
    idConversation: {
        type: String,
        hashKey: true,
    },
    idSender: {
        type: String,
        rangeKey: true,
        index: {
            global: true,
            name: 'IDSender-lastChange-index',
            rangeKey: 'lastChange',
            project: false,
        },
    },
    idReceiver: String,
    idNewestMessage: String,
    isBlock: Boolean,
    imageList: {
        type: Array,
        default: [],
        schema: [String],
    },
    fileList: {
        type: Array,
        default: [],
        schema: [String],
    },
    lastChange: {
        type: String,
        default: moment.tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm:ss.SSS'),
    }
})

const Conversation = mongoose.model("Conversation", ConversationSchema);

module.exports = Conversation;