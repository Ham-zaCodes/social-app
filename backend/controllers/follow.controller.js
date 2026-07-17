const pool = require("../config/db");
const { createNotification } = require("../models/notification.model"); // Import notification trigger

// 1. Toggle Follow/Unfollow (Protected)
exports.toggleFollow = async (req, res, next) => {
  try {
    const followerId = req.user.id; // Logged-in user
    const followingId = parseInt(req.params.id); // User to follow/unfollow

    if (followerId === followingId) {
      return res
        .status(400)
        .json({ error: { message: "You cannot follow yourself" } });
    }

    // Verify target user actually exists
    const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [
      followingId,
    ]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: { message: "User not found" } });
    }

    // Check if the follow relationship already exists
    const followCheck = await pool.query(
      "SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2",
      [followerId, followingId],
    );

    if (followCheck.rows.length > 0) {
      // Already following -> Unfollow
      await pool.query(
        "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2",
        [followerId, followingId],
      );
      return res
        .status(200)
        .json({ followed: false, message: "Unfollowed user successfully" });
    } else {
      // Not following -> Follow
      await pool.query(
        "INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)",
        [followerId, followingId],
      );

      // Trigger Notification: Target user ko pata chale k kisne follow kiya
      await createNotification(followingId, followerId, "FOLLOW");

      return res
        .status(200)
        .json({ followed: true, message: "Followed user successfully" });
    }
  } catch (err) {
    next(err);
  }
};

// 2. Get User Followers (Public)
exports.getFollowers = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.bio
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = $1`,
      [userId],
    );

    res.status(200).json({ followers: result.rows });
  } catch (err) {
    next(err);
  }
};

// 3. Get User Following (Public)
exports.getFollowing = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.bio
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = $1`,
      [userId],
    );

    res.status(200).json({ following: result.rows });
  } catch (err) {
    next(err);
  }
};
