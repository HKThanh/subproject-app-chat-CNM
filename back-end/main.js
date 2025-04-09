const express = require("express");
const app = express();
const port = 3000;
const bodyParser = require("body-parser");
const { createServer } = require("node:http");
const connectDB = require("./config/connectMongo");
const { initSocket, getIO } = require("./config/socket");

const authController = require("./controllers/authController")
const authRoutes = require("./routes/authRoute");
const userRoutes = require("./routes/userRoute");
const socketController = require("./controllers/socketController");
const friendRequestRoutes = require("./routes/friendRequestRoute");

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
connectDB();

const server = createServer(app);
initSocket(server); // Khởi tạo socket
const io = getIO(); // Lấy instance của socket.io

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/friend-request", friendRequestRoutes);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socketController.handleUserOnline(socket);
    socketController.handleLoadConversation(io, socket);
    socketController.handleSendMessage(io, socket);
    socketController.handleSendFile(io, socket);
    socketController.handleDeleteMessage(io, socket);
    socketController.handleRecallMessage(io, socket);
    socketController.handleForwardMessage(io, socket);
});

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
});
