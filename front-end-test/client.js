const socket = io("http://localhost:3000", {
    reconnection: true,
    transports: ["websocket"],
});
let peerConnection;
let peerConnections = {};
let localStream;
let connectedUserSocketId;
let groupId;
let callLogId;
let callState = "IDLE";
let iceCandidates = []; // Global for caller

const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function updateStatus(status) {
    document.getElementById("callStatus").textContent = `Status: ${status}`;
}

function logEvent(message) {
    const logDiv = document.getElementById("log");
    logDiv.innerHTML += `<p>${new Date().toLocaleTimeString()}: ${message}</p>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

function registerUser() {
    const userId = document.getElementById("userId").value;
    if (userId) {
        socket.emit("register", userId);
        updateStatus(`Registered as ${userId}`);
        logEvent(`Registered as ${userId}`);
    } else {
        alert("Please enter a User ID");
    }
}

async function getMedia(callType) {
    try {
        const constraints = callType === "video" ? { video: true, audio: true } : { audio: true };
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        document.getElementById("localVideo").srcObject = localStream;
        logEvent(`Media stream acquired for ${callType}`);
    } catch (error) {
        logEvent(`Media error: ${error.message}`);
        alert("Failed to access camera/microphone. Please check permissions.");
        throw error;
    }
}

async function startCall(callType) {
    const calleeId = document.getElementById("calleeId").value;
    const userId = document.getElementById("userId").value;
    if (!userId) return alert("Please register first");
    if (!calleeId) return alert("Please enter a Callee ID");
    if (callState !== "IDLE") {
        alert("Cannot start a new call while another call is in progress.");
        return;
    }

    callState = "DIALING";
    await getMedia(callType);
    peerConnection = new RTCPeerConnection(configuration);
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    iceCandidates = [];
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            iceCandidates.push(event.candidate);
            logEvent(`Collected ICE candidate (waiting for connection)`);
        }
    };

    peerConnection.ontrack = (event) => {
        const remoteVideo = document.createElement("video");
        remoteVideo.autoplay = true;
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.id = "remoteVideo";
        document.getElementById("remoteVideos").appendChild(remoteVideo);
        logEvent("Received remote stream");
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("pre-offer-single", {
        IDCaller: userId,
        IDCallee: calleeId,
        callType,
    });
    updateStatus("Dialing...");
    logEvent(`Initiated ${callType} call to ${calleeId}`);
}

socket.on("pre-offer-single", async (data) => {
    const { IDCaller, socketIDCaller, callType, callLogId: logId } = data;
    callLogId = logId;
    logEvent(`Incoming ${callType} call from ${IDCaller}`);

    if (callState !== "IDLE") {
        socket.emit("pre-offer-single-answer", {
            IDCaller,
            socketIDCaller,
            IDCallee: document.getElementById("userId").value,
            socketIDCallee: socket.id,
            preOfferAnswer: "CALL_UNAVAILABLE",
            callLogId,
        });
        logEvent("Rejected incoming call: User is busy");
        return;
    }

    if (confirm(`Incoming ${callType} call from ${IDCaller}. Accept?`)) {
        callState = "IN_CALL";
        await getMedia(callType);
        peerConnection = new RTCPeerConnection(configuration);
        localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

        const localIceCandidates = [];
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                localIceCandidates.push(event.candidate);
                logEvent(`Collected ICE candidate (waiting for connection)`);
            }
        };

        peerConnection.ontrack = (event) => {
            const remoteVideo = document.createElement("video");
            remoteVideo.autoplay = true;
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.id = "remoteVideo";
            document.getElementById("remoteVideos").appendChild(remoteVideo);
            logEvent("Received remote stream");
        };

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        connectedUserSocketId = socketIDCaller;
        socket.emit("pre-offer-single-answer", {
            IDCaller,
            socketIDCaller,
            IDCallee: document.getElementById("userId").value,
            socketIDCallee: socket.id,
            preOfferAnswer: "CALL_ACCEPTED",
            callLogId,
        });

        // Send collected ICE candidates after accepting
        localIceCandidates.forEach((candidate) => {
            socket.emit("webRTC-signaling", {
                connectedUserSocketId: socketIDCaller,
                signaling: { type: "candidate", candidate },
            });
            logEvent(`Sent ICE candidate to ${socketIDCaller}`);
        });

        // Update onicecandidate to send future candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("webRTC-signaling", {
                    connectedUserSocketId: socketIDCaller,
                    signaling: { type: "candidate", candidate: event.candidate },
                });
                logEvent(`Sent ICE candidate to ${socketIDCaller}`);
            }
        };

        document.getElementById("endCallBtn").style.display = "block";
        updateStatus("Connected");
        logEvent("Accepted call");
    } else {
        socket.emit("pre-offer-single-answer", {
            IDCaller,
            socketIDCaller,
            IDCallee: document.getElementById("userId").value,
            socketIDCallee: socket.id,
            preOfferAnswer: "CALL_REJECTED",
            callLogId,
        });
        updateStatus("Call rejected");
        logEvent("Rejected call");
    }
});

socket.on("pre-offer-single-answer", async (data) => {
    const { preOfferAnswer, socketIDCallee } = data;
    connectedUserSocketId = socketIDCallee;
    callLogId = data.callLogId;
    logEvent(`Received call response: ${preOfferAnswer}`);
    if (preOfferAnswer === "CALL_ACCEPTED") {
        callState = "IN_CALL";
        socket.emit("webRTC-signaling", {
            connectedUserSocketId,
            signaling: { type: "offer", sdp: peerConnection.localDescription },
        });

        // Send collected ICE candidates
        iceCandidates.forEach((candidate) => {
            socket.emit("webRTC-signaling", {
                connectedUserSocketId,
                signaling: { type: "candidate", candidate },
            });
            logEvent(`Sent ICE candidate to ${connectedUserSocketId}`);
        });

        // Update onicecandidate to send future candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("webRTC-signaling", {
                    connectedUserSocketId,
                    signaling: { type: "candidate", candidate: event.candidate },
                });
                logEvent(`Sent ICE candidate to ${connectedUserSocketId}`);
            }
        };

        document.getElementById("endCallBtn").style.display = "block";
        updateStatus("Connected");
        logEvent("Call connected");
    } else if (preOfferAnswer === "CALL_UNAVAILABLE") {
        updateStatus("Callee is busy");
        closeConnection();
        logEvent("Callee is busy");
        callState = "IDLE";
    } else {
        updateStatus("Call rejected or unavailable");
        closeConnection();
        logEvent("Call rejected or unavailable");
        callState = "IDLE";
    }
});

socket.on("webRTC-signaling", async (data) => {
    const { connectedUserSocketId, signaling } = data;
    if (signaling.type === "offer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signaling.sdp));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("webRTC-signaling", {
            connectedUserSocketId,
            signaling: { type: "answer", sdp: peerConnection.localDescription },
        });
        logEvent("Processed WebRTC offer and sent answer");
    } else if (signaling.type === "answer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signaling.sdp));
        logEvent("Processed WebRTC answer");
    } else if (signaling.type === "candidate") {
        await peerConnection.addIceCandidate(new RTCIceCandidate(signaling.candidate));
        logEvent("Added ICE candidate");
    }
});

// End 1:1 call
function endCall() {
    socket.emit("end-call", { connectedUserSocketId, callLogId });
    closeConnection();
    updateStatus("Call ended");
    logEvent("Ended call");
    callState = "IDLE";
}

socket.on("end-call", (data) => {
    updateStatus("Call ended by other user");
    closeConnection();
    logEvent("Call ended by other user");
    callState = "IDLE";
});

// Close connection
function closeConnection() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        localStream = null;
    }
    document.getElementById("localVideo").srcObject = null;
    document.getElementById("remoteVideos").innerHTML = "";
    document.getElementById("endCallBtn").style.display = "none";
    connectedUserSocketId = null;
    callLogId = null;
    logEvent("Connection closed");
}

// // Start group call
// async function startGroupCall(callType) {
//     const userId = document.getElementById("userId").value;
//     const participants = document.getElementById("groupParticipants").value.split(",").map(id => id.trim());
//     if (!userId) return alert("Please register first");
//     if (!participants.length) return alert("Please enter participant IDs");

//     await getMedia(callType);
//     groupId = "group_" + Math.random().toString(36).substr(2, 9);
//     socket.emit("create-group-call", { groupId, participants });
//     updateStatus("Starting group call...");
//     logEvent(`Started group call with participants: ${participants.join(", ")}`);
// }

// // Handle group call invite
// socket.on("group-call-invite", async ({ groupId: invitedGroupId, callerId, callLogId: logId }) => {
//     callLogId = logId;
//     logEvent(`Group call invite from ${callerId}`);
//     if (confirm(`Group call invite from ${callerId}. Join?`)) {
//         await getMedia("video");
//         groupId = invitedGroupId;
//         socket.emit("join-group-call", { groupId, callLogId });
//         document.getElementById("leaveGroupBtn").style.display = "block";
//         updateStatus("Joined group call");
//         logEvent("Joined group call");
//     }
// });

// // Handle new user in group
// socket.on("user-joined-group", ({ userId, socketId }) => {
//     if (socketId !== socket.id) {
//         createPeerConnection(socketId);
//         updateStatus(`${userId} joined the group call`);
//         logEvent(`${userId} joined the group call`);
//     }
// });

// // Handle group WebRTC signaling
// socket.on("group-webRTC-signaling", async ({ signaling, fromSocketId }) => {
//     const pc = peerConnections[fromSocketId];
//     if (!pc) return;
//     logEvent(`Group WebRTC signaling from ${fromSocketId}: ${signaling.type}`);
//     if (signaling.type === "offer") {
//         await pc.setRemoteDescription(new RTCSessionDescription(signaling.sdp));
//         const answer = await pc.createAnswer();
//         await pc.setLocalDescription(answer);
//         socket.emit("group-webRTC-signaling", {
//             groupId,
//             signaling: { type: "answer", sdp: pc.localDescription },
//             targetSocketId: fromSocketId,
//         });
//         logEvent(`Sent group WebRTC answer to ${fromSocketId}`);
//     } else if (signaling.type === "answer") {
//         await pc.setRemoteDescription(new RTCSessionDescription(signaling.sdp));
//         logEvent(`Processed group WebRTC answer from ${fromSocketId}`);
//     } else if (signaling.type === "candidate") {
//         await pc.addIceCandidate(new RTCIceCandidate(signaling.candidate));
//         logEvent(`Added group ICE candidate from ${fromSocketId}`);
//     }
// });

// // Create peer connection for group call
// function createPeerConnection(targetSocketId) {
//     const pc = new RTCPeerConnection(configuration);
//     peerConnections[targetSocketId] = pc;

//     localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

//     pc.onicecandidate = (event) => {
//         if (event.candidate) {
//             socket.emit("group-webRTC-signaling", {
//                 groupId,
//                 signaling: { type: "candidate", candidate: event.candidate },
//                 targetSocketId,
//             });
//             logEvent(`Sent group ICE candidate to ${targetSocketId}`);
//         }
//     };

//     pc.ontrack = (event) => {
//         const videoElement = document.createElement("video");
//         videoElement.autoplay = true;
//         videoElement.srcObject = event.streams[0];
//         videoElement.id = `video_${targetSocketId}`;
//         document.getElementById("remoteVideos").appendChild(videoElement);
//         logEvent(`Received group stream from ${targetSocketId}`);
//     };

//     pc.createOffer().then((offer) => {
//         pc.setLocalDescription(offer);
//         socket.emit("group-webRTC-signaling", {
//             groupId,
//             signaling: { type: "offer", sdp: pc.localDescription },
//             targetSocketId,
//         });
//         logEvent(`Sent group offer to ${targetSocketId}`);
//     });
// }

// // Handle user leaving group
// socket.on("user-left-group", ({ userId, socketId }) => {
//     if (peerConnections[socketId]) {
//         peerConnections[socketId].close();
//         delete peerConnections[socketId];
//         const video = document.getElementById(`video_${socketId}`);
//         if (video) video.remove();
//         updateStatus(`${userId} left the group call`);
//         logEvent(`${userId} left the group call`);
//     }
// });

// // Leave group call
// function leaveGroupCall() {
//     socket.emit("leave-group-call", { groupId, callLogId });
//     for (let socketId in peerConnections) {
//         peerConnections[socketId].close();
//         delete peerConnections[socketId];
//     }
//     if (localStream) {
//         localStream.getTracks().forEach((track) => track.stop());
//         localStream = null;
//     }
//     document.getElementById("localVideo").srcObject = null;
//     document.getElementById("remoteVideos").innerHTML = "";
//     document.getElementById("leaveGroupBtn").style.display = "none";
//     updateStatus("Left group call");
//     logEvent("Left group call");
//     groupId = null;
//     callLogId = null;
// }

// Debug socket connection
socket.on("connect", () => {
    logEvent("Connected to server");
});
socket.on("disconnect", () => {
    logEvent("Disconnected from server");
});