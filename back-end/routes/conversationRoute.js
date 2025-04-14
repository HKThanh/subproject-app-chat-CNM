const router = require("express").Router();
const userController = require("../controllers/userController");
const conversationController = require("../controllers/conversationController");
const conversationModel = require("../models/ConversationModel");
const UserModel = require("../models/UserModel");
const authMiddleware = require("../middlewares/authMiddleware");
const multer = require("multer");
const Conversation = require("../models/ConversationModel");
const upload = multer();

router.post(
    "/getMessageDetail",
    conversationController.getMessageDetailByIDConversation
);

router.post(
    "/createNewGroupConversation",
    authMiddleware,
    upload.single("groupAvatar"),
    async (req, res) => {
        const IDOwner = req.user.id; // ID của người tạo nhóm
        let { groupName, groupMembers } = req.body;
        const groupAvatar = req.file;
        // groupMembers là mảng ID của các thành viên kể cả người tạo nhóm
        // groupMembers = ["1", "2", "3", "4"];

        if (groupName.length === 0) {
            return res.json({ message: "Tên nhóm không được để trống", status: -1 });
        }

        if (groupMembers.length > 0) {
            const data = await conversationController.createNewGroupConversation(
                IDOwner,
                groupName,
                groupAvatar,
                groupMembers
            );

            res.json({message: "Tạo nhóm thành công", status: 1, data: data}); // Success
        } else {
            res.json({ message: "phải thêm 1 thành viên để tạo nhóm", status: 0 });
        }
        
    }
);

// API thêm 1 user thành phó nhóm
router.post("/addCoOwnerToGroup", authMiddleware, async (req, res) => {
    const IDOwner = req.user.id; // ID của người tạo nhóm
    const { IDConversation, IDCoOwner } = req.body;

    if (!IDConversation || !IDCoOwner) {
        return res.json({ message: "Thiếu IDConversation hoặc IDCoOwner", status: -1 });
    }

    const coOwner = await UserModel.findOne({id: IDCoOwner});
    if (!coOwner) {
        return res.json({ message: "Người dùng không tồn tại", status: -1 });
    }

    if (IDOwner === IDCoOwner) {
        return res.json({ message: "Không thể thêm chính mình làm phó nhóm", status: -1 });
    }

    const owner = await Conversation.findOne({ idConversation: IDConversation, "rules.IDOwner": IDOwner });
    if (!owner) {
        return res.json({ message: "Trưởng nhóm mới được quyền thêm phó nhóm", status: -1 });
    }

    const isCoOwner = await Conversation.findOne({ idConversation: IDConversation, "rules.listIDCoOwner": IDCoOwner });
    if (isCoOwner) {
        return res.json({ message: "Người dùng đã là phó nhóm", status: -1 });
    }

    try {
        const data = await conversationController.addCoOwnerToGroup(
            IDOwner,
            IDConversation,
            IDCoOwner
        );
        return res.json(data); // Success
    } catch (error) {
        res.json(error);
    }
});

router.post("/removeCoOwnerFromGroup", authMiddleware, async (req, res) => {
    const IDOwner = req.user.id; // ID của người tạo nhóm
    const { IDConversation, IDCoOwner } = req.body;

    if (!IDConversation || !IDCoOwner) {
        return res.json({ message: "Thiếu IDConversation hoặc IDCoOwner", status: -1 });
    }

    const coOwner = await UserModel.findOne({id: IDCoOwner});
    if (!coOwner) {
        return res.json({ message: "Người dùng không tồn tại", status: -1 });
    }

    const isCoOwner = await Conversation.findOne({ idConversation: IDConversation, "rules.listIDCoOwner": IDCoOwner });
    if (!isCoOwner) {
        return res.json({ message: "Người dùng không phải là phó nhóm", status: -1 });
    }

    if (IDOwner === IDCoOwner) {
        return res.json({ message: "Bạn đã là nhóm trưởng", status: -1 });
    }

    const owner = await Conversation.findOne({ idConversation: IDConversation, "rules.IDOwner": IDOwner });
    if (!owner) {
        return res.json({ message: "Trưởng nhóm mới được quyền xoá phó nhóm", status: -1 });
    }

    try {
        const data = await conversationController.removeCoOwnerFromGroup(
            IDOwner,
            IDConversation,
            IDCoOwner
        );
        return res.json(data); // Success
    } catch (error) {
        res.json(error);
    }
});

router.post(
    "/get-member-info",
    authMiddleware,
    conversationController.getMemberInfoByIDConversation
);

router.post("/leave-group", authMiddleware, async (req, res) => {
    const IDSender = req.user.id;
    const { IDConversation } = req.body;

    if (!IDConversation) {
        return res.json({ message: "Thiếu IDConversation", status: -1 });
    }

    const conversation = await Conversation.findOne({ idConversation: IDConversation });
    if (!conversation) {
        return res.json({ message: "Nhóm không tồn tại", status: -1 });
    }

    const isOwner = await Conversation.findOne({ idConversation: IDConversation, "rules.IDOwner": IDSender });
    if (isOwner) {
        return res.json({ message: "Người tạo nhóm không thể rời nhóm", status: -1 });
    }

    const isMember = await Conversation.findOne({ idConversation: IDConversation, groupMembers: IDSender });
    if (!isMember) {
        return res.json({ message: "Người dùng không phải là thành viên nhóm", status: -1 });
    }

    try {
        const data = await conversationController.leaveGroup(IDConversation, IDSender);
        return res.json(data); // Success
    } catch (error) {
        res.json(error);
    }

});
router.post('/get-conversation-by-user-friend', authMiddleware, conversationController.getConversationByUserFriend);

router.post("/update-info-group", 
    upload.single("groupAvatar"),
    authMiddleware,
    async (req, res) => {
        const IDSender = req.user.id; // ID của người tạo nhóm

        const { IDConversation, groupName } = req.body;
        const groupAvatar = req.file.buffer;

        const conversation = await Conversation.findOne({ idConversation: IDConversation });
        if (!conversation) {
            return res.json({ message: "Nhóm không tồn tại", status: -1 });
        }

        const data = await conversationController.updateInfoGroup(IDConversation, groupName, groupAvatar);
        res.json(data);
    }
);

router.post("/search-group", authMiddleware, async (req, res) => {
    const IDUser = req.user.id;
    const { keyword } = req.body;
    const data = await conversationController.searchConversationByName(IDUser, keyword);
    res.json(data);
});

router.post("/change-owner", authMiddleware, async (req, res) => {
    const IDOwner = req.user.id; // ID của người tạo nhóm
    const { IDConversation, IDNewOwner } = req.body;

    if (!IDConversation || !IDNewOwner) {
        return res.json({ message: "Thiếu IDConversation hoặc IDNewOwner", status: -1 });
    }

    const newOwner = await UserModel.findOne({id: IDNewOwner});
    if (!newOwner) {
        return res.json({ message: "Người dùng không tồn tại", status: -1 });
    }

    if (IDOwner === IDNewOwner) {
        return res.json({ message: "Bạn đã là trưởng nhóm", status: -1 });
    }

    const owner = await Conversation.findOne({ idConversation: IDConversation, "rules.IDOwner": IDOwner });
    if (!owner) {
        return res.json({ message: "Trưởng nhóm mới được quyền đổi trưởng nhóm mới", status: -1 });
    }

    const isMember = await Conversation.findOne({ idConversation: IDConversation, groupMembers: IDNewOwner });
    if (!isMember) {
        return res.json({ message: "Người dùng không phải là thành viên nhóm", status: -1 });
    }

    try {
        const data = await conversationController.changeOwnerGroup(
            IDOwner,
            IDConversation,
            IDNewOwner
        );
        return res.json(data); // Success
    } catch (error) {
        res.json(error);
    }
});

router.post("/remove-member", authMiddleware, async (req, res) => {
    const IDOwner = req.user.id; // ID của người tạo nhóm
    const { IDConversation, IDMember } = req.body;

    if (!IDConversation || !IDMember) {
        return res.json({ message: "Thiếu IDConversation hoặc IDMember", status: -1 });
    }

    const member = await UserModel.findOne({id: IDMember});
    if (!member) {
        return res.json({ message: "Người dùng không tồn tại", status: -1 });
    }

    if (IDOwner === IDMember) {
        return res.json({ message: "Người dùng không thể tự đuổi chính mình", status: -1 });
    }

    const owner = await Conversation.findOne({ idConversation: IDConversation, "rules.IDOwner": IDOwner });
    if (!owner) {
        return res.json({ message: "Trưởng nhóm mới được quyền đuổi thành viên", status: -1 });
    }

    const isMember = await Conversation.findOne({ idConversation: IDConversation, groupMembers: IDMember });
    if (!isMember) {
        return res.json({ message: "Người dùng không phải là thành viên nhóm", status: -1 });
    }

    const checkNumberMember = await Conversation.findOne({ idConversation: IDConversation });
    if (checkNumberMember.groupMembers.length <= 2) {
        return res.json({ message: "Không thể đuổi thành viên cuối cùng trong nhóm", status: -1 });
    }

    try {
        const data = await conversationController.removeMemberFromGroup(
            IDOwner,
            IDConversation,
            IDMember
        );
        return res.json(data); // Success
    } catch (error) {
        res.json(error);
    }
});

module.exports = router;
