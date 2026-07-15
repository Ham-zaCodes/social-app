const express = require("express");
const router = express.Router();
const postController = require("../controllers/post.controller");
const protect = require("../middleware/auth"); // Authentication barrier

// Add this line inside routes/post.routes.js:
router.get("/feed", protect, postController.getHomeFeed);

// Public feed access
router.get("/", postController.getFeed);

// Protected mutations
router.post("/", protect, postController.createPost);
router.delete("/:id", protect, postController.deletePost);

module.exports = router;
