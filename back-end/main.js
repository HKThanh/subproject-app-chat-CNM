const express = require("express");
const app = express();
const port = 3000;
const bodyParser = require("body-parser");
const { createServer } = require("node:http");
const cors = require("cors");
const connectDB = require("./config/connectMongo");
const authRoutes = require("./routes/authRoute");

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
connectDB();

app.use("/auth", authRoutes);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

process.on('SIGINT', async () => {
    await redisClient.quit();
    console.log('Redis connection closed');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
    });
});