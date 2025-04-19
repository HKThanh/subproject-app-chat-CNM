const router = require("express").Router();
const ConversationController = require("../controllers/conversationController");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/get-member-info", authMiddleware, ConversationController.getMemberInfoByIDConversation);

module.exports = router;