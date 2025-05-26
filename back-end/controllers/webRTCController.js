const socketController = require("./socketController");
const CallLog = require("../models/CallLogModel");

const handleCall = (io, socket) => {
    // Event socket for offer call
    socket.on("pre-offer-single", async (data) => {
        console.log("Received pre-offer-single:", data);
        const { IDCaller, IDCallee, callType } = data;
        const connectedPeer = socketController.getUser(IDCallee);
        const socketIDConnectedPeer = connectedPeer?.socketId;

        console.log(`Looking up callee ${IDCallee}:`, connectedPeer);
        // Tạo bản ghi cuộc gọi mới
        const newCallLog = new CallLog({
            caller: IDCaller,
            callee: IDCallee,
            callType: callType,
            startTime: new Date(),
            status: "PENDING"
        });

        // Lưu bản ghi và lấy ID
        const savedCallLog = await newCallLog.save();
        const callLogId = savedCallLog._id.toString();
        if (connectedPeer) {
            console.log(`Forwarding call to ${IDCallee} (socket: ${socketIDConnectedPeer})`);
            const data = {
                IDCaller,
                socketIDCaller: socket.id,
                IDCallee,
                socketIDCallee: socketIDConnectedPeer,
                callType,
                callLogId
            };
            io.to(socketIDConnectedPeer).emit("pre-offer-single", data);
        } else {
            console.log(`Callee ${IDCallee} not found`);
            // Cập nhật trạng thái cuộc gọi
            await CallLog.findByIdAndUpdate(callLogId, {
                status: "CALLEE_NOT_FOUND",
                endTime: new Date()
            });

            const responseData = {
                preOfferAnswer: "CALLEE_NOT_FOUND",
                callLogId // Thêm callLogId vào phản hồi
            };
            io.to(socket.id).emit("pre-offer-single-answer", responseData);
        }
    });

    // Event socket for answer call
    //data = {IDCaller: SDT người gọi,  : "CALL_ACCEPTED" hoặc "CALL_REJECTED" hoặc "CALL_UNAVAILABLE"}
    socket.on("pre-offer-single-answer", async (data) => {
        const { IDCaller, socketIDCaller, IDCallee, socketIDCallee, preOfferAnswer, callLogId } = data;
        console.log("Received pre-offer-single-answer:", data);

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
        console.log("Received webRTC-signaling:", data);
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