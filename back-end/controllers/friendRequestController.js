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

    const senderId = req.user.id;

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
                    message: `Đã gửi yêu cầu kết bạn`,
                });
            }
            if (status === "ACCEPTED") {
                return res.status(200).json({
                    code: 2,
                    message: `Đã là bạn bè`,
                });
            }
        } else {
            return res.status(200).json({
                code: 1,
                message: "Không tìm thấy yêu cầu kết bạn",
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
            message: "Không tìm thấy yêu cầu kết bạn nào",
        });
    }

    return res.status(200).json({
        code: 0,
        message: "Lấy danh sách yêu cầu kết bạn thành công",
        data: requests,
    });
}

FriendRequestController.getAllFriendsById = async (req, res) => {
    const userId = req.user.id;
    if (!userId) {
        return res.status(400).json({
            code: 1,
            message: "Thiếu thông tin",
        });
    }

    try {
        const user = await UserModel.findOne({ id: userId });

        if (!user) {
            return res.status(404).json({
                code: 1,
                message: "Không tìm thấy người dùng",
            });
        }

        const friendsId = user.friendList;
        let friends = [];
        if (friendsId && friendsId.length > 0) {
            friends = await UserModel.find({ id: { $in: friendsId } })
            .select('id fullname email phone urlavatar coverPhoto')
            .lean();
        }

        if (!friends) {
            return res.status(404).json({
                code: 1,
                message: "Không tìm thấy bạn bè",
            });
        }
        return res.status(200).json({
            code: 0,
            message: "Lấy danh sách bạn bè thành công",
            data: friends,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            code: 1,
            message: "Lỗi server",
        });
    }
}

module.exports = FriendRequestController;
