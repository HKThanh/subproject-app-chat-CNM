const dynamoose = require("dynamoose");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// This is for AWS
// const UserSchema = new dynamoose.Schema({
//     id: {
//         type: String,
//         hashKey: true,
//     },
//     username: String,
//     password: String,
//     fullname: String,
//     ismale: Boolean,
//     phone: String,
//     urlavatar: String,
//     birthday: String,
//     friendList: {
//         type: Array,
//         schema: [String],
//     },
//     createdAt: {
//         type: Date,
//         default: Date.now,
//     },
//     updatedAt: {
//         type: Date,
//         default: Date.now,
//     }
// })

// const User = dynamoose.model("User", UserSchema);

// This is for mongoDB
const UserSchema = new Schema({
    id: {
        type: String,
        hashKey: true,
    },
    username: String,
    password: String,
    fullname: String,
    ismale: Boolean,
    phone: String,
    urlavatar: String,
    birthday: String,
    friendList: {
        type: Array,
        schema: [String],
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
        async get(username) {
            return await this.findOne({ username: username });
        }
    }
});

const User = mongoose.model("User", UserSchema);


module.exports = User;