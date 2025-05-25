const UserModel = require('../models/UserModel');

const friendController = {};

// API tìm kiếm bạn bè theo tên và email với sort theo chữ cái đầu của fullname
friendController.searchFriends = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { text, sortOrder = 'asc', limit = 50, offset = 0 } = req.query;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng nhập từ khóa tìm kiếm",
                data: null,
                error: "Search text is required",
                code: 0
            });
        }

        // Lấy thông tin user hiện tại để có danh sách bạn bè
        const currentUser = await UserModel.findOne({ id: currentUserId });
        if (!currentUser || !currentUser.friendList || currentUser.friendList.length === 0) {
            return res.status(200).json({
                success: true,
                message: "Không có bạn bè nào",
                data: {
                    friends: [],
                    total: 0,
                    offset: parseInt(offset),
                    limit: parseInt(limit),
                    hasMore: false
                },
                error: null,
                code: 1
            });
        }

        // Chuẩn hóa từ khóa tìm kiếm
        const normalizedText = text.trim();
        const searchPattern = new RegExp(normalizedText, "i");

        // Tìm kiếm trong danh sách bạn bè theo fullname và email (loại trừ bản thân)
        const friends = await UserModel.find({
            id: { 
                $in: currentUser.friendList,
                $ne: currentUserId // Loại trừ bản thân
            },
            $or: [
                { fullname: searchPattern },
                { email: searchPattern }
            ]
        }, {
            _id: 0,
            id: 1,
            fullname: 1,
            urlavatar: 1,
            phone: 1,
            email: 1,
            bio: 1,
            coverPhoto: 1
        });

        // Sắp xếp kết quả theo chữ cái đầu của fullname
        const sortDirection = sortOrder === 'desc' ? -1 : 1;
        friends.sort((a, b) => {
            const firstCharA = a.fullname.charAt(0).toLowerCase();
            const firstCharB = b.fullname.charAt(0).toLowerCase();
            return firstCharA.localeCompare(firstCharB, 'vi', { sensitivity: 'base' }) * sortDirection;
        });

        // Phân trang
        const startIndex = parseInt(offset);
        const endIndex = startIndex + parseInt(limit);
        const paginatedFriends = friends.slice(startIndex, endIndex);

        return res.status(200).json({
            success: true,
            message: `Tìm thấy ${friends.length} bạn bè phù hợp`,
            data: {
                friends: paginatedFriends,
                total: friends.length,
                offset: startIndex,
                limit: parseInt(limit),
                hasMore: endIndex < friends.length
            },
            error: null,
            code: 1
        });

    } catch (error) {
        console.error("Search friends error:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server khi tìm kiếm bạn bè",
            data: null,
            error: error.message,
            code: -1
        });
    }
};

// API lấy tất cả bạn bè với sort theo chữ cái đầu của fullname
friendController.getAllFriendsWithSort = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { sortOrder = 'asc', limit = 50, offset = 0 } = req.query;

        // Lấy thông tin user hiện tại
        const currentUser = await UserModel.findOne({ id: currentUserId });
        if (!currentUser || !currentUser.friendList || currentUser.friendList.length === 0) {
            return res.status(200).json({
                success: true,
                message: "Không có bạn bè nào",
                data: {
                    friends: [],
                    total: 0,
                    offset: parseInt(offset),
                    limit: parseInt(limit),
                    hasMore: false
                },
                error: null,
                code: 1
            });
        }

        // Lấy thông tin chi tiết của tất cả bạn bè (loại trừ bản thân)
        const friends = await UserModel.find({
            id: { 
                $in: currentUser.friendList,
                $ne: currentUserId // Loại trừ bản thân
            }
        }, {
            _id: 0,
            id: 1,
            fullname: 1,
            urlavatar: 1,
            phone: 1,
            email: 1,
            bio: 1,
            coverPhoto: 1,
            status: 1
        });

        // Sắp xếp kết quả theo chữ cái đầu của fullname
        const sortDirection = sortOrder === 'desc' ? -1 : 1;
        friends.sort((a, b) => {
            const firstCharA = a.fullname.charAt(0).toLowerCase();
            const firstCharB = b.fullname.charAt(0).toLowerCase();
            return firstCharA.localeCompare(firstCharB, 'vi', { sensitivity: 'base' }) * sortDirection;
        });

        // Phân trang
        const startIndex = parseInt(offset);
        const endIndex = startIndex + parseInt(limit);
        const paginatedFriends = friends.slice(startIndex, endIndex);

        return res.status(200).json({
            success: true,
            message: "Lấy danh sách bạn bè thành công",
            data: {
                friends: paginatedFriends,
                total: friends.length,
                offset: startIndex,
                limit: parseInt(limit),
                hasMore: endIndex < friends.length
            },
            error: null,
            code: 1
        });

    } catch (error) {
        console.error("Get friends with sort error:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách bạn bè",
            data: null,
            error: error.message,
            code: -1
        });
    }
};

module.exports = friendController;