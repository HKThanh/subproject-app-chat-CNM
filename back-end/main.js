const express = require("express");
const app = express();
const port = 3000;
const bodyParser = require("body-parser");
const { createServer } = require("node:http");
const cors = require("cors");
const connectDB = require("./config/connectMongo");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoute");
const userRoutes = require("./routes/userRoute");

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
connectDB();

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/user", userRoutes);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    AuthController.generateQR(null, null, io, socket);

    socket.on('verifyToken', (token) => {
        AuthController.verifyToken(io, socket, token);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

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