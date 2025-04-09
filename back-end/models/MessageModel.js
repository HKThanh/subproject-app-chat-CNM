const dynamoose = require("dynamoose");

const schema = new dynamoose.Schema({
    IDConversation: {
        type: String,
        hashKey: true,
    },
    IDNewestBucket: String,
});

const Message = dynamoose.model("Message", schema);

module.exports = Message;