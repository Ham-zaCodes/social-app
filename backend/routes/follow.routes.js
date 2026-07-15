const express = require("express");
const router = express.Router();
const followController = require("../controllers/follow.controller");
const protect = require("../middleware/auth");

// Toggle follow relationship
router.post("/:id/follow", protect, followController.toggleFollow);

// Get lists
router.get("/:id/followers", followController.getFollowers);
router.get("/:id/following", followController.getFollowing);

module.exports = router;
