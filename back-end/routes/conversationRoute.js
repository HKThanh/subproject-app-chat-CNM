const router = require("express").Router();
const ConversationController = require("../controllers/conversationController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/get-member-info", authMiddleware, ConversationController.getMemberInfoByIDConversation);

module.exports = router;