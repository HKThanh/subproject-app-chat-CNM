const socketController = require("./socketController");
const CallLog = require("../models/CallLogModel");

const handleCall = (io, socket) => {
    // Event socket for offer call
    socket.on("pre-offer-single", async (data) => {
        // IDCaller = SDT người gọi
        // IDCallee = SDT người nhận cuộc gọi
        const { IDCaller, IDCallee, callType } = data;

        const callLog = new CallLog({
            callerId: IDCaller,
            calleeId: IDCallee,
            callType,
            status: "INITIATED",
            startTime: new Date(),
        });
        await callLog.save();

        const connectedPeer = socketController.getUser(IDCallee);
        const socketIDConnectedPeer = connectedPeer?.socketId;

        if (connectedPeer) {
            const data = {
                IDCaller,
                socketIDCaller: socket.id,
                IDCallee,
                socketIDCallee: socketIDConnectedPeer,
                callType,
            };
            io.to(socketIDConnectedPeer).emit("pre-offer-single", data);
        } else {
            const data = {
                preOfferAnswer: "CALLEE_NOT_FOUND", // Callee không online
            };
            io.to(socket.id).emit("pre-offer-single-answer", data);
        }
    });

    // Event socket for answer call
    //data = {IDCaller: SDT người gọi,  : "CALL_ACCEPTED" hoặc "CALL_REJECTED" hoặc "CALL_UNAVAILABLE"}
    socket.on("pre-offer-single-answer", async (data) => {
        const { IDCaller, socketIDCaller, IDCallee, socketIDCallee, preOfferAnswer, callLogId } = data;

        // Cập nhật log dựa trên phản hồi
        if (preOfferAnswer === "CALL_ACCEPTED") {
            await CallLog.findByIdAndUpdate(callLogId, { status: "ACCEPTED" });
        } else {
            await CallLog.findByIdAndUpdate(callLogId, { status: preOfferAnswer, endTime: new Date() });
        }

        const connectedPeer = socketController.getUser(IDCaller);
        if (connectedPeer) {
            io.to(connectedPeer.socketId).emit("pre-offer-single-answer", data);
        } else {
            await CallLog.findByIdAndUpdate(callLogId, { status: "CALLER_NOT_FOUND", endTime: new Date() });
            io.to(socket.id).emit("pre-offer-single-answer", { preOfferAnswer: "CALLER_NOT_FOUND" });
        }
    });

    // Event socket for call
    socket.on("webRTC-signaling", (data) => {
        // data = {connectedUserSocketId: SDT người nhận signaling, signaling: signaling}
        const { connectedUserSocketId } = data;

        const connectedPeer = socketController.getUserBySocketId(connectedUserSocketId);

        if (connectedPeer) {
            io.to(connectedUserSocketId).emit("webRTC-signaling", data);
        }
    });

    // Event socket for end call
    socket.on("end-call", async (data) => {
        const { connectedUserSocketId, callLogId } = data;

        // Cập nhật log khi cuộc gọi kết thúc
        await CallLog.findByIdAndUpdate(callLogId, { status: "ENDED", endTime: new Date() });

        const connectedPeer = socketController.getUserBySocketId(connectedUserSocketId);
        if (connectedPeer) {
            io.to(connectedUserSocketId).emit("end-call", { from: socket.id, callLogId });
        }
    });
}

module.exports = {
    handleCall
}