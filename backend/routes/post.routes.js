const express = require("express");
const router = express.Router();
const postController = require("../controllers/post.controller");
const protect = require("../middleware/auth"); // Authentication barrier
const upload = require("../middleware/upload"); // Use the Cloudinary Upload Middleware

// Personalized home feed (following + self)
router.get("/feed", protect, postController.getHomeFeed);

// Global public feed access
router.get("/", postController.getFeed);

// Create Post - Handles Cloudinary upload via multer-storage-cloudinary
router.post("/", protect, upload.single("image"), postController.createPost);

// Delete post
router.delete("/:id", protect, postController.deletePost);

module.exports = router;
