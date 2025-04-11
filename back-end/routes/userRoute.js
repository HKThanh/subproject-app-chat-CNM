const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const fileService = require("../services/fileService");

const userRoutes = (io) => {

  router.get("/get-all", userController.getAllUsers);
  router.get("/", authMiddleware, userController.getUser);
  router.get("/friend-requests", authMiddleware, userController.getAllFriendRequests);

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

  router.post("/cancel/:receiverId", authMiddleware, (req, res) => userController.cancelFriendRequest(req, res, io));

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

  return router;
}

module.exports = userRoutes;