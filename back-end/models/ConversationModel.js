const dynamoose = require("dynamoose");
const moment = require('moment-timezone');

const ConversationSchema = new dynamoose.Schema({
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
    isBlock: {
        type: Boolean,
        default: false
    },
    // Lưu danh sách URL của hình ảnh trong cuộc trò chuyện
    listImage: {
        type: Array,
        default: [],
        schema: [String],
    },
    // Lưu danh sách URL của file trong cuộc trò chuyện
    listFile: {
        type: Array,
        default: [],
        schema: [String],
    },
    lastChange: {
        type: String,
        default: moment.tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm:ss.SSS'),
    }
});

const Conversation = dynamoose.model("Conversation", ConversationSchema);
module.exports = Conversation;
