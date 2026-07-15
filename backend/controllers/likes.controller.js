const pool = require("../config/db");

// Toggle Like / Unlike (Protected)
exports.toggleLike = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id; // Post ID being liked/unliked

    // 1. Verify target post actually exists
    const postCheck = await pool.query("SELECT id FROM posts WHERE id = $1", [
      postId,
    ]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: { message: "Post not found" } });
    }

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
      return res
        .status(200)
        .json({ liked: true, message: "Post liked successfully" });
    }
  } catch (err) {
    next(err);
  }
};
