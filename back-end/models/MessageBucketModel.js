const dynamoose = require("dynamoose");

const MessageBucketSchema = new dynamoose.Schema({
    IDBucketMessage: String,
    listIDMessageDetail: {
        type: Array,
        schema: [String]
    },
    IDNextBucket: {
        default: "",
        type: String
    }
});

const MessageBucket = dynamoose.model("MessageBucket", MessageBucketSchema);

module.exports = MessageBucket;