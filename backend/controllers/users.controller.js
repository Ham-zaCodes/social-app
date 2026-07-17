const pool = require("../config/db");

// 1. Get User Profile (Public) - Fetch by Username
exports.getUserProfile = async (req, res, next) => {
  try {
    const username = req.params.username;

    // Fetch user details + follow counts using highly accurate subqueries
    const userQuery = await pool.query(
      `SELECT 
        u.id, u.username, u.email, u.avatar_url, u.bio, u.created_at,
        (SELECT COUNT(*)::int FROM follows WHERE following_id = u.id) AS followers_count,
        (SELECT COUNT(*)::int FROM follows WHERE follower_id = u.id) AS following_count,
        (SELECT COUNT(*)::int FROM posts WHERE user_id = u.id) AS posts_count
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
        p.image_url, 
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

// 2. Get User Profile By ID (Protected)
exports.getUserProfileById = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const userQuery = await pool.query(
      `SELECT 
        u.id, u.username, u.email, u.avatar_url, u.bio, u.created_at,
        (SELECT COUNT(*)::int FROM follows WHERE following_id = u.id) AS followers_count,
        (SELECT COUNT(*)::int FROM follows WHERE follower_id = u.id) AS following_count,
        (SELECT COUNT(*)::int FROM posts WHERE user_id = u.id) AS posts_count
       FROM users u WHERE u.id = $1`,
      [userId]
    );

    if (userQuery.rows.length === 0)
      return res.status(404).json({ error: { message: "User not found" } });

    const user = userQuery.rows[0];

    const postsQuery = await pool.query(
      `SELECT p.id, p.content, p.image_url, p.created_at,
        COUNT(DISTINCT l.user_id)::int AS likes_count,
        COUNT(DISTINCT c.id)::int AS comments_count
       FROM posts p
       LEFT JOIN likes l ON p.id = l.post_id
       LEFT JOIN comments c ON p.id = c.post_id
       WHERE p.user_id = $1
       GROUP BY p.id ORDER BY p.created_at DESC`,
      [userId]
    );

    res.status(200).json({ profile: user, posts: postsQuery.rows });
  } catch (err) { next(err); }
};

// 3. Update User Profile (Protected) - avatar_url JSON mein aata hai (frontend Cloudinary se upload karta hai)
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { bio, avatar_url } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET bio = CASE WHEN $1::text IS NULL THEN bio ELSE $1 END, 
           avatar_url = CASE WHEN $2::text IS NULL THEN avatar_url ELSE $2 END
       WHERE id = $3
       RETURNING id, username, email, avatar_url, bio`,
      [bio === undefined ? null : bio, avatar_url || null, userId]
    );

    res.status(200).json({ user: result.rows[0], message: "Profile updated successfully" });
  } catch (err) { next(err); }
};

// 4. Search Users (Public)
exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res
        .status(400)
        .json({ error: { message: "Search query cannot be empty" } });
    }

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

// 5. Get Follow Suggestions (Protected)
exports.getSuggestions = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;

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

// 6. Get Notifications (Protected)
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        n.*,
        u.username as sender_username,
        u.avatar_url as sender_avatar,
        c.content as comment_text
       FROM notifications n
       JOIN users u ON n.sender_id = u.id
       LEFT JOIN comments c ON n.type = 'COMMENT'
         AND c.post_id = n.entity_id
         AND c.user_id = n.sender_id
       WHERE n.receiver_id = $1
       ORDER BY n.created_at DESC`,
      [userId],
    );

    res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
};

// 7. Mark All Notifications as Read (Protected)
exports.markNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE receiver_id = $1`,
      [userId],
    );

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};
