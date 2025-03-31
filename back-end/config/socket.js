const { Server } = require("socket.io");

const initSocketIO = server => {
    const io = new Server(server, {
        cors: {
            origin: "*",
        },
        maxHttpBufferSize: 1e8,
    });

    return io;
}