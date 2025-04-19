const dynamoose = require("dynamoose");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// const schema = new dynamoose.Schema({
//     id: {
//         type: "string",
//         hashKey: true,
//         index: true,
//         default: () => uuidv4(),
//     },
//     senderId: {
//         type: "string",
//         index: true,
//     },
//     receiverId: {
//         type: "string",
//         index: true,
//     },
//     //   PENDING | ACCEPTED | DECLINED
//     status: String,
//     createdAt: {
//         type: Date,
//         default: Date.now,
//     },
//     updatedAt: {
//         type: Date,
//         default: Date.now,
//     },
// });

const friendRequestSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            default: uuidv4,
            index: true,
        },
        senderId: {
            type: String,
            index: true,
            required: true,
        },
        receiverId: {
            type: String,
            index: true,
            required: true,
        },
        // PENDING | ACCEPTED | DECLINED
        status: {
            type: String,
            enum: ["PENDING", "ACCEPTED", "DECLINED"],
            default: "PENDING",
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    }, {
        statics: {
            async scan(senderId, receiverId) {
                return await this.find({ senderId: senderId, receiverId: receiverId });
            }
        }
    }
);

// const FriendRequest = dynamoose.model("FriendRequest", schema);

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);
module.exports = FriendRequest;
