const { Server } = require("socket.io");
const socketController = require("../controllers/socketController");
const authController = require("../controllers/authController");
const redisClient = require("../services/redisClient");

let io;

const initSocketIO = (server) => {
    return new Server(server, {
        cors: {
            origin: "*",
        },
        maxHttpBufferSize: 1e9, // Cho phép gửi file lớn
        pingTimeout: 24 * 60 * 60 * 1000,    // 24 hours
        pingInterval: 25000,                  // 25 seconds
        reconnection: true,
        reconnectionAttempts: Infinity,       // Vô hạn số lần thử kết nối lại
        reconnectionDelay: 1000,             // Delay 1 giây trước mỗi lần thử
        reconnectionDelayMax: 5000,          // Tối đa 5 giây delay
    });
};

const initSocket = (server) => {
    io = initSocketIO(server);

    io.on("connection", (socket) => {
        console.log("New client connected: " + socket.id);

        // Auth handlers
        socket.on("getQRCode", () => {
            authController.generateQR(socket, io);
        });

        socket.on("verifyQRToken", (data) => {
            authController.verifyToken(io, socket, data);
        });
        
        socket.on('joinDevice', (deviceKey) => {
            socket.join(deviceKey);
            console.log(`Socket ${socket.id} joined room ${deviceKey}`);
        });

        socket.on('joinFriendRequest', (userId) => {
            socket.join(userId);
            console.log(`Socket ${socket.id} joined room ${userId}`);
        });

        socket.on('joinUserRoom', (userId) => {
            socket.join(userId);
            console.log(`Socket ${socket.id} joined room ${userId}`);
        });

        // Chat handlers từ socketController
        socketController.handleUserOnline(socket);
        socketController.handleLoadConversation(io, socket);
        socketController.handleSendFile(io, socket);
        socketController.handleSendMessage(io, socket);
        socketController.handleDeleteMessage(io, socket);
        socketController.handleRecallMessage(io, socket);
        socketController.handleForwardMessage(io, socket);
        socketController.handleLoadMessages(io, socket);
        socketController.handleMarkMessagesRead(socket);
        socketController.handleCheckUsersStatus(socket);
        socketController.handleUserDisconnect(socket);
        socketController.handleCreateConversation(io, socket);
        // socketController.handleAddMembers(io, socket);
        socketController.handleAddMemberToGroup(io, socket);
        
        // Thêm các hàm quản lý nhóm chat
        socketController.handleCreatGroupConversation(io, socket);
        socketController.handleRemoveMemberFromGroup(io, socket);
        socketController.handleChangeOwnerGroup(io, socket);
        socketController.handleSendGroupMessage(io, socket);
        socketController.handleLoadMemberOfGroup(io, socket);
        socketController.handleLeaveGroup(io, socket);
        socketController.handleUpdateGroupInfo(io, socket);
        socketController.handlePromoteMemberToAdmin(io, socket);
        socketController.handleDemoteMember(io, socket);
        socketController.handleDeleteGroup(io, socket);
        
        // Thêm các tính năng nâng cao cho nhóm
        socketController.handleSearchMessagesInGroup(io, socket);
        socketController.handlePinGroupMessage(io, socket);
        
        // Thêm hàm quản lý room conversation
        socketController.handleJoinConversation(io, socket);
        socketController.handleLeaveConversation(io, socket);
        // socketController.handleTyping(io, socket);

        socket.on("disconnect", () => {
            console.log("Client disconnected: " + socket.id);
            const user = socketController.getUserBySocketId(socket.id);
            if (user) {
                console.log("User disconnected:", user.phone);
            }
        });
    });
};

const getIO = () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
};

module.exports = {
    initSocket,
    getIO,
};
