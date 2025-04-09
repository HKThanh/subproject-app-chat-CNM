const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const fileService = require("../services/fileService");

router.get("/get-all", userController.getAllUsers);
router.get("/", authMiddleware, userController.getUserByPhone);
router.post("/friend-requests", authMiddleware, userController.getAllFriendRequests);

router.put(
  "/avatar/upload",
  authMiddleware,
  fileService.uploadAvatar.single("avatar"),
  fileService.processAvatar,
  userController.updateAvatar,
);

router.put("/profile", authMiddleware,   userController.updateProfile);

router.post("/send", authMiddleware, userController.sendFriendRequest);

router.post("/handle", authMiddleware, userController.handleFriendRequest);

router.post("/cancel/:receiverId", authMiddleware, userController.cancelFriendRequest); 
router.put("/bio", authMiddleware, userController.updateBio);
router.put(
  "/cover/upload",
  authMiddleware,
  fileService.uploadAvatar.single("coverPhoto"),
  fileService.processAvatar,
  userController.updateCoverPhoto
);

module.exports = router;