const express = require("express");
const router = express.Router();
const usersController = require("../controllers/users.controller");
const protect = require("../middleware/auth");

router.get("/search", usersController.searchUsers);
router.get("/suggestions", protect, usersController.getSuggestions);
router.get("/notifications", protect, usersController.getNotifications);
router.post("/notifications/read", protect, usersController.markNotificationsAsRead);
router.get("/profile/:username", usersController.getUserProfile);
router.get("/:id/profile", protect, usersController.getUserProfileById);
router.put("/profile", protect, usersController.updateProfile);

module.exports = router;
