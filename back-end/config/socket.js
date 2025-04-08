let io;

const initSocket = (server) => {
    const { Server } = require("socket.io");
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    io.on("connection", (socket) => {
        console.log("New client connected: " + socket.id);

        socket.on("getQRCode", () => {
            authController.generateQR(socket);
        });

        socket.on("verifyQRToken", (data) => {
            authController.verifyToken(io, socket, data);
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected: " + socket.id);
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
