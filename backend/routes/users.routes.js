const express = require("express");
const router = express.Router();
const usersController = require("../controllers/users.controller");
const protect = require("../middleware/auth");

// Search endpoints
router.get("/search", usersController.searchUsers);

// --- NEW SUGGESTIONS ROUTE ---
// Must sit above dynamic routes to avoid parameter collisions
router.get("/suggestions", protect, usersController.getSuggestions);

// Profile detail & updates
router.get("/profile/:username", usersController.getUserProfile);
router.put("/profile", protect, usersController.updateProfile);

module.exports = router;
