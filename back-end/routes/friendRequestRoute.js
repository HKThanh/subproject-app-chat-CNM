const router = require("express").Router();
const FriendRequestController = require("../controllers/friendRequestController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post(
    "/check-request-exists",
    authMiddleware,
    FriendRequestController.checkRequestExists
)

router.get(
    "/get-all-requests",
    authMiddleware,
    FriendRequestController.getAllRequests
)

module.exports = router