const express = require("express");
const app = express();
const port = 3000;
const bodyParser = require("body-parser");
const { createServer } = require("node:http");
const cors = require("cors");
const connectDB = require("./config/connectDynamodb");
const { Server } = require("socket.io");

const authController = require("./controllers/authController")
const authRoutes = require("./routes/authRoute");
const userRoutes = require("./routes/userRoute");

// const corsOptions = {
//     origin: ['http://localhost:3000', 'http://localhost:3001'], // Add your frontend URLs
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     credentials: true,
//     optionsSuccessStatus: 200
// };

// app.use(cors(corsOptions));
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
    authController.generateQR(null, null, io, socket);

    socket.on('verifyToken', (token) => {
        authController.verifyToken(io, socket, token);
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