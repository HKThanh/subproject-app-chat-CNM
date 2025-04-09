const dynamoose = require("dynamoose");

const MessageDetailSchema = new dynamoose.Schema({
    idMessage: {
        type: String,
        required: true,
    },
    idSender: String,
    idConversation: String,
    type: String,
    content: String,
    dateTime: String,
    isRecall: {
        type: Boolean,
        default: false,
    },
    isReply: {
        type: Boolean,
        default: false,
    },
    isFoward: {
        type: Boolean,
        default: false,
    },
    isRemove: {
        type: String,
        default: false
    },
    idMessageReply: {
        type: String,
        default: null,
    },
})

const MessageDetail = dynamoose.model("MessageDetail", MessageDetailSchema);

module.exports = MessageDetail;