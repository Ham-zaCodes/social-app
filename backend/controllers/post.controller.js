// controllers/post.controller.js
const pool = require("../config/db");
const sanitizeHtml = require("sanitize-html");

// 1. Create a Post (Protected)
exports.createPost = async (req, res, next) => {
  try {
    const { content, media_url } = req.body;
    const userId = req.user.id; // From our auth middleware

    if (!content || content.trim() === "") {
      return res
        .status(400)
        .json({ error: { message: "Post content cannot be empty" } });
    }

    // Sanitize the content to strip out any <script> tags or harmful HTML
    const cleanContent = sanitizeHtml(content, {
      allowedTags: [], // We don't want to allow ANY HTML tags in standard text posts
      allowedAttributes: {}, // Strip all attributes
    });

    const result = await pool.query(
      `INSERT INTO posts (user_id, content, media_url)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, content, media_url, created_at`,
      [userId, cleanContent, media_url || null], // <-- Updated to use cleanContent + media_url fallback
    );

    res.status(201).json({ post: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// 2. Get Feed / All Posts (Includes author details & counts)
exports.getFeed = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.id, 
        p.content, 
        p.media_url, 
        p.created_at,
        u.id AS author_id,
        u.username AS author_username,
        u.avatar_url AS author_avatar,
        COUNT(DISTINCT l.user_id)::int AS likes_count,
        COUNT(DISTINCT c.id)::int AS comments_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN likes l ON p.id = l.post_id
       LEFT JOIN comments c ON p.id = c.post_id
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC`,
    );

    res.status(200).json({ posts: result.rows });
  } catch (err) {
    next(err);
  }
};

// 3. Delete a Post (Protected - Owner Check)
exports.deletePost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id; // From our auth middleware

    // Check if post exists and who owns it
    const postQuery = await pool.query(
      "SELECT user_id FROM posts WHERE id = $1",
      [postId],
    );

    if (postQuery.rows.length === 0) {
      return res.status(404).json({ error: { message: "Post not found" } });
    }

    if (postQuery.rows[0].user_id != userId) {
      return res
        .status(403)
        .json({ error: { message: "Unauthorized to delete this post" } });
    }

    // Delete the post (likes and comments cascade automatically because of DB schema rules)
    await pool.query("DELETE FROM posts WHERE id = $1", [postId]);

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// 4. Get Personalized Feed (Protected - Only shows followed users' posts + your own)
exports.getHomeFeed = async (req, res, next) => {
  try {
    const userId = req.user.id; // Logged-in user ID from auth gateway

    const result = await pool.query(
      `SELECT 
        p.id, 
        p.content, 
        p.media_url, 
        p.created_at,
        u.id AS author_id,
        u.username AS author_username,
        u.avatar_url AS author_avatar,
        COUNT(DISTINCT l.user_id)::int AS likes_count,
        COUNT(DISTINCT c.id)::int AS comments_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN likes l ON p.id = l.post_id
       LEFT JOIN comments c ON p.id = c.post_id
       WHERE p.user_id = $1 
          OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1)
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC`,
      [userId],
    );

    res.status(200).json({ posts: result.rows });
  } catch (err) {
    next(err);
  }
};
