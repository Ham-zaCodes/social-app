const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const usersController = require("../controllers/users.controller");
const protect = require("../middleware/auth");

// --- Configure Multer Storage for Avatars ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Search endpoints
router.get("/search", usersController.searchUsers);

// --- NEW SUGGESTIONS ROUTE ---
router.get("/suggestions", protect, usersController.getSuggestions);

// --- NOTIFICATIONS ROUTES ---
// Fetch notifications for the authenticated user
router.get("/notifications", protect, usersController.getNotifications);
// Mark all notifications as read
router.post(
  "/notifications/read",
  protect,
  usersController.markNotificationsAsRead,
);

// Profile detail & updates
router.get("/profile/:username", usersController.getUserProfile);

// Dynamic profile route to fetch data by raw ID (used on user dashboard views)
router.get("/:id/profile", protect, usersController.getUserProfileById);

// Update profile containing an optional avatar image file and text-based bio
router.put(
  "/profile",
  protect,
  upload.single("avatar"),
  usersController.updateProfile,
);

module.exports = router;
