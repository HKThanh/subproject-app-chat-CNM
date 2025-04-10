const express = require("express");
const app = express();
const port = 3000;
const bodyParser = require("body-parser");
const { createServer } = require("node:http");
const connectDB = require("./config/connectMongo");
const { initSocket } = require("./config/socket");
const { redisClient } = require("./services/redisClient");
const cors = require('cors');

const authRoutes = require("./routes/authRoute");
const userRoutes = require("./routes/userRoute");
const friendRequestRoutes = require("./routes/friendRequestRoute");

// Bật CORS
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Kết nối database
connectDB();

// Tạo HTTP server
const server = createServer(app);

// Khởi tạo Socket.IO
initSocket(server);

// Routes
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/friend-request", friendRequestRoutes);

// Lắng nghe trên server thay vì app
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

process.on('SIGINT', async () => {
    await redisClient.quit();
    console.log('Redis connection closed');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
    });
});/*  */
