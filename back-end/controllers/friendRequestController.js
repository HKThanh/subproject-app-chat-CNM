const FriendRequestModel = require("../models/FriendRequestModel");

const FriendRequestController = {}

FriendRequestController.checkRequestExists = async (req, res) => {
    const { senderId, receiverId } = req.body;
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
