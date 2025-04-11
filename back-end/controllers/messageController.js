const { model } = require('dynamoose');
const MessageModel = require('../models/MessageModel');
const BucketMessageController = require('./BucketMessageController');
const getMessagesByIDConversation = async (IDConversation) => {
    const data = await MessageModel.get(IDConversation);
    return data;
}

const updateMessage = async (message) => {
    const data = await MessageModel.update(message);
    return data;
}

const createNewMessage = async (IDConversation) => {
    const newBucket = await BucketMessageController.createNewBucketMessage();
    const dataMessage = {
        IDConversation: IDConversation,
        IDNewestBucket: newBucket.IDBucketMessage
    }
    const message = await MessageModel.create(dataMessage);
    return message;
}

const getMessageByID = async (IDConversation) => {
    const data = await MessageModel.get(IDConversation);
    return data;
}

module.exports = {
    getMessagesByIDConversation,
    createNewMessage,
    updateMessage,
    getMessageByID
}