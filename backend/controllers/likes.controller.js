const pool = require("../config/db");
const { createNotification } = require("../models/notification.model"); // Import notification trigger

// Toggle Like / Unlike (Protected)
exports.toggleLike = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id; // Post ID being liked/unliked

    // 1. Verify target post actually exists & get the post author's ID
    const postCheck = await pool.query(
      "SELECT id, user_id FROM posts WHERE id = $1",
      [postId],
    );
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: { message: "Post not found" } });
    }

    const postOwnerId = postCheck.rows[0].user_id;

    // 2. Check if user already liked this post
    const likeCheck = await pool.query(
      "SELECT 1 FROM likes WHERE user_id = $1 AND post_id = $2",
      [userId, postId],
    );

    if (likeCheck.rows.length > 0) {
      // Already liked -> Unlike
      await pool.query(
        "DELETE FROM likes WHERE user_id = $1 AND post_id = $2",
        [userId, postId],
      );
      return res
        .status(200)
        .json({ liked: false, message: "Post unliked successfully" });
    } else {
      // Not liked yet -> Like
      await pool.query("INSERT INTO likes (user_id, post_id) VALUES ($1, $2)", [
        userId,
        postId,
      ]);

      // Trigger Notification: Post owner ko batayein k post like hui hai
      await createNotification(postOwnerId, userId, "LIKE", postId);

      return res
        .status(200)
        .json({ liked: true, message: "Post liked successfully" });
    }
  } catch (err) {
    next(err);
  }
};
