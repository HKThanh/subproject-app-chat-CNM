const dynamoose = require("dynamoose");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const generateBirthdate = () => {
    const randomDate = new Date();
    randomDate.setFullYear(Math.floor(Math.random() * (2003 - 1950 + 1)) + 1950);
    randomDate.setMonth(Math.floor(Math.random() * 12));
    randomDate.setDate(Math.floor(Math.random() * 31));
    return randomDate.toISOString().split("T")[0];
}

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
    fullname: {
        type: String,
        default: "Người dùng mới",
    },
    ismale: {
        type: Boolean,
        default: true,
    },
    phone: String,
    urlavatar: {
        type: String,
        default: "",
    },
    birthday: {
        type: String,
        default: generateBirthdate,
    },
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
        async get(phone) {
            return await this.findOne({ phone: phone });
        }
    }
});

const User = mongoose.model("User", UserSchema);


module.exports = User;