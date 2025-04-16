const mongoose = require("mongoose");

const callLogSchema = new mongoose.Schema({
    callerId: String,
    calleeId: String,
    callType: String,
    status: String, // "INITIATED", "ACCEPTED", "REJECTED", "ENDED"
    startTime: Date,
    endTime: Date,
});

module.exports = mongoose.model("CallLog", callLogSchema);