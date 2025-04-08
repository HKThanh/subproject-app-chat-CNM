const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const fileService = require("../services/fileService");

router.get("/get-all", authMiddleware, userController.getAllUsers);
router.get("/:phone", authMiddleware, userController.getUserByPhone);
router.put(
  "/:phone/avatar/upload",
  fileService.uploadAvatar.single("avatar"),
  fileService.processAvatar,
  userController.updateAvatar
);
router.put("/:phone/profile", userController.updateProfile); 
router.put("/:phone/bio", userController.updateBio);
router.put(
  "/:phone/cover/upload",
  fileService.uploadAvatar.single("coverPhoto"),
  fileService.processAvatar,
  userController.updateCoverPhoto
);

module.exports = router;