const express = require("express");
const router = express.Router();
const likesController = require("../controllers/likes.controller");
const protect = require("../middleware/auth");

// Toggle like state on a post
router.post("/:id/like", protect, likesController.toggleLike);

module.exports = router;
