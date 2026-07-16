const pool = require("../config/db");

// 1. Get User Profile (Public) - FIXED count calculation using clean subqueries
exports.getUserProfile = async (req, res, next) => {
  try {
    const username = req.params.username;

    // Fetch user details + follow counts using highly accurate subqueries
    const userQuery = await pool.query(
      `SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.avatar_url, 
        u.bio, 
        u.created_at,
        (SELECT COUNT(*)::int FROM follows WHERE following_id = u.id) AS followers_count,
        (SELECT COUNT(*)::int FROM follows WHERE follower_id = u.id) AS following_count
       FROM users u
       WHERE u.username = $1`,
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

    // Direct mapping updates, falling back to database state if undefined (allowing null values to go through)
    const result = await pool.query(
      `UPDATE users 
       SET bio = CASE WHEN $1::text IS NULL THEN bio ELSE $1 END, 
           avatar_url = CASE WHEN $2::text IS NULL THEN avatar_url ELSE $2 END
       WHERE id = $3
       RETURNING id, username, email, avatar_url, bio`,
      [
        bio === undefined ? null : bio,
        avatar_url === undefined ? null : avatar_url,
        userId,
      ],
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

// 4. Get Follow Suggestions (Protected) - NEW ADDITION
exports.getSuggestions = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;

    // Fetch users who aren't the current user and are not currently followed by them
    const result = await pool.query(
      `SELECT id, username, avatar_url, bio 
       FROM users 
       WHERE id != $1 
       AND id NOT IN (
         SELECT following_id FROM follows WHERE follower_id = $1
       )
       LIMIT 5`,
      [currentUserId],
    );

    res.status(200).json({ users: result.rows });
  } catch (err) {
    next(err);
  }
};
