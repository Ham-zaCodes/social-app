const pool = require("../config/db");

exports.toggleLike = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // Check if like already exists
    const existingLike = await pool.query(
      "SELECT * FROM likes WHERE user_id = $1 AND post_id = $2",
      [userId, postId],
    );

    if (existingLike.rows.length > 0) {
      // Unlike
      await pool.query(
        "DELETE FROM likes WHERE user_id = $1 AND post_id = $2",
        [userId, postId],
      );
      return res.status(200).json({ liked: false, message: "Post unliked" });
    } else {
      // Like
      await pool.query("INSERT INTO likes (user_id, post_id) VALUES ($1, $2)", [
        userId,
        postId,
      ]);
      return res.status(201).json({ liked: true, message: "Post liked" });
    }
  } catch (err) {
    next(err);
  }
};
