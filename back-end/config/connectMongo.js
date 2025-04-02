const mongoose = require('mongoose');
require('dotenv').config();
const { MONGO_URI } = process.env;

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("MongoDB connected");
    } catch (error) {
        console.error(error);
    }
};

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

module.exports = connectDB;