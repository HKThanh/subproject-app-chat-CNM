const express = require("express");
const app = express();
const port = 3000;
const bodyParser = require("body-parser");
const { createServer } = require("node:http");
const connectDB = require("./config/connectMongo");
const { initSocket, getIO } = require("./config/socket");
const redisClient = require("./services/redisClient");
const cors = require("cors")

const authRoutes = require("./routes/authRoute");
const userRoutes = require("./routes/userRoute");
const friendRequestRoutes = require("./routes/friendRequestRoute");
const uploadRoutes = require("./routes/upload");
const conversationRoutes = require("./routes/conversationRoute");
const roomRoute = require("./routes/roomRoute");

const corsOptions = {
    origin: ['http://localhost:3001', 'http://localhost:8082'], // Add your frontend URLs
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
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
const io = getIO();

// Routes
app.use("/auth", authRoutes(io));
app.use("/user", userRoutes(io));
app.use("/friend-request", friendRequestRoutes);
app.use("/upload", uploadRoutes);
app.use("/conversation", conversationRoutes);
app.use("/room", roomRoute);

server.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port} and accessible from all network interfaces`);
    console.log(`API địa chỉ: http://localhost:${port}`);
});

process.on('SIGINT', async () => {
    await redisClient.quit();
    console.log('Redis connection closed');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed');
        process.exit(0);
    });
});