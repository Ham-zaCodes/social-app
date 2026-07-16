const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const postController = require("../controllers/post.controller");
const protect = require("../middleware/auth"); // Authentication barrier

// --- Configure Multer Storage ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Saves files to the /uploads directory at your project root
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // Generate a unique filename while preserving the original file extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({ storage });

// Add this line inside routes/post.routes.js:
router.get("/feed", protect, postController.getHomeFeed);

// Public feed access
router.get("/", postController.getFeed);

// Protected mutations
// ADDED: upload.single("image") middleware to handle dynamic photo uploads on post creation
router.post("/", protect, upload.single("image"), postController.createPost);
router.delete("/:id", protect, postController.deletePost);

module.exports = router;
