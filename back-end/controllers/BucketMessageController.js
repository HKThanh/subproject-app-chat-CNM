const MessageBucketModel = require('../models/MessageBucketModel');
const { v4: uuidv4 } = require('uuid');
const getMessageBucketByID = async (IDMessageBucket) => {
    const data = await MessageBucketModel.get(IDMessageBucket);
    return data;
}

const createMessageBucket = async (bucket) => {
    const data = await MessageBucketModel.create(bucket);
    return data;
}

const updateMessageBucket = async (bucket) => { 
    const data = await MessageBucketModel.update(bucket);
    return data;

}
const createNewBucketMessage = async () => {
    const dataBucket = {
        IDBucketMessage: uuidv4(),
        listIDMessageDetail: [],
        IDNextBucket: ""
    }
    const bucket = await MessageBucketModel.create(dataBucket);
    return bucket;
}

module.exports = {
    getMessageBucketByID,
    createMessageBucket,
    updateMessageBucket,
    createNewBucketMessage
};