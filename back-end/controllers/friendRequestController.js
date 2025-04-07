const FriendRequestModel = require("../models/FriendRequestModel");
const UserModel = require("../models/UserModel");
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_REFRESH } = process.env;

const FriendRequestController = {}

FriendRequestController.checkRequestExists = async (req, res) => {
    const { receiverId } = req.body;

    const { authorization } = req.headers;

    if (!authorization) {
        return res.status(401).json({
            code: 1,
            message: "Unauthorized",
        });
    }

    const senderId = req.user.phone;

    console.log(senderId);
    

    try {
        // const request = await FriendRequestModel.scan({
        //     senderId: receiverId,
        //     receiverId: senderId,
        // }).exec();

        const request = await FriendRequestModel.scan(senderId, receiverId);

        if (request[0]) {
            const status = request[0].status;

            if (status === "PENDING") {
                return res.status(200).json({
                    code: 0,
                    message: `Friend request is exist`,
                });
            }
            if (status === "ACCEPTED") {
                return res.status(200).json({
                    code: 2,
                    message: `Already friend`,
                });
            }
        } else {
            return res.status(200).json({
                code: 1,
                message: "Friend request not found",
            });
        }
    } catch (error) {
        console.error(error);
        return false;
    }
};

FriendRequestController.getAllRequests = async (req, res) => {
    const requests = await FriendRequestModel.find();

    if (!requests) {
        return res.status(404).json({
            code: 1,
            message: "No friend requests found",
        });
    }

    return res.status(200).json({
        code: 0,
        message: "Get all friend requests successfully",
        data: requests,
    });
}

module.exports = FriendRequestController;
