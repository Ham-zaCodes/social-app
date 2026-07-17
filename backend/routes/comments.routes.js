const express = require("express");
const router = express.Router();
const commentsController = require("../controllers/comments.controller");
const protect = require("../middleware/auth");

// Comments endpoints
router.post("/:id/comment", protect, commentsController.addComment);
router.get("/:id/comments", commentsController.getComments);
router.delete("/:id/comments/:commentId", protect, commentsController.deleteComment);

module.exports = router;
