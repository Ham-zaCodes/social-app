const pool = require("../config/db");

// 1. Get User Profile (Public)
exports.getUserProfile = async (req, res, next) => {
  try {
    const username = req.params.username;

    // Fetch user details + follow counts in one query
    const userQuery = await pool.query(
      `SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.avatar_url, 
        u.bio, 
        u.created_at,
        COUNT(DISTINCT f1.follower_id)::int AS followers_count,
        COUNT(DISTINCT f2.following_id)::int AS following_count
       FROM users u
       LEFT JOIN follows f1 ON u.id = f1.following_id
       LEFT JOIN follows f2 ON u.id = f2.follower_id
       WHERE u.username = $1
       GROUP BY u.id`,
      [username],
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: { message: "User not found" } });
    }

    const user = userQuery.rows[0];

    // Fetch this specific user's posts
    const postsQuery = await pool.query(
      `SELECT 
        p.id, 
        p.content, 
        p.media_url, 
        p.created_at,
        COUNT(DISTINCT l.user_id)::int AS likes_count,
        COUNT(DISTINCT c.id)::int AS comments_count
       FROM posts p
       LEFT JOIN likes l ON p.id = l.post_id
       LEFT JOIN comments c ON p.id = c.post_id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [user.id],
    );

    res.status(200).json({
      user,
      posts: postsQuery.rows,
    });
  } catch (err) {
    next(err);
  }
};

// 2. Update User Profile (Protected)
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { bio, avatar_url } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET bio = COALESCE($1, bio), 
           avatar_url = COALESCE($2, avatar_url)
       WHERE id = $3
       RETURNING id, username, email, avatar_url, bio`,
      [bio || null, avatar_url || null, userId],
    );

    res
      .status(200)
      .json({ user: result.rows[0], message: "Profile updated successfully" });
  } catch (err) {
    next(err);
  }
};

// 3. Search Users (Public)
exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query; // e.g., /api/users/search?q=tester

    if (!q || q.trim() === "") {
      return res
        .status(400)
        .json({ error: { message: "Search query cannot be empty" } });
    }

    // ILIKE performs a case-insensitive search
    const result = await pool.query(
      `SELECT id, username, avatar_url, bio 
       FROM users 
       WHERE username ILIKE $1 
       LIMIT 10`,
      [`%${q}%`],
    );

    res.status(200).json({ users: result.rows });
  } catch (err) {
    next(err);
  }
};
