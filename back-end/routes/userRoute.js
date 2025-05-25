const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const userController = require("../controllers/userController");
const friendRequestController = require("../controllers/friendRequestController");
const friendController = require("../controllers/friendController");
const authMiddleware = require("../middlewares/authMiddleware");
const fileService = require("../services/fileService");

const userRoutes = (io) => {

  router.get("/get-all", userController.getAllUsers);
  router.get("/", authMiddleware, userController.getUser);
  router.get("/get-received-friend-requests", authMiddleware, userController.getAllReceivedFriendRequests);
  router.get("/get-sended-friend-requests", authMiddleware, userController.getAllSendedFriendRequest);

  router.put(
    "/avatar/upload",
    authMiddleware,
    fileService.uploadAvatar.single("avatar"),
    fileService.processAvatar,
    userController.updateAvatar,
  );

  router.put("/profile", authMiddleware, userController.updateProfile);

  router.post("/send", authMiddleware, (req, res) => userController.sendFriendRequest(req, res, io));

  router.post("/handle", authMiddleware, (req, res) => userController.handleFriendRequest(req, res, io));

  router.post("/cancel/:requestId", authMiddleware, (req, res) => userController.cancelFriendRequest(req, res, io));

  router.put("/bio", authMiddleware, userController.updateBio);

  router.put(
    "/cover/upload",
    authMiddleware,
    fileService.uploadAvatar.single("coverPhoto"),
    fileService.processAvatar,
    userController.updateCoverPhoto
  );

  router.put("/phone", authMiddleware, userController.updatePhone);

  router.post("/search", authMiddleware, userController.findUserByText);

  router.get("/:id", authMiddleware, userController.getUserById);

  // Block user
  router.post('/blocked/block', authMiddleware, (req, res) => userController.blockUser(req, res, io));

  router.post('/blocked/unblock', authMiddleware, (req, res) => userController.unblockUser(req, res, io));

  router.get('/blocked/get-blocked', authMiddleware, (req, res) => userController.getBlockedUsers(req, res));

  router.get('/friend/get-friends', authMiddleware, (req, res) => friendRequestController.getAllFriendsById(req, res));

  router.post("/friend/unfriend", authMiddleware, (req, res) => userController.unFriend(req, res, io));

  // API tìm kiếm bạn bè
  router.get('/friend/search', authMiddleware, friendController.searchFriends);

  // API lấy danh sách bạn bè với sort
  router.get('/friend/list', authMiddleware, friendController.getAllFriendsWithSort);

  return router;
}

module.exports = userRoutes;