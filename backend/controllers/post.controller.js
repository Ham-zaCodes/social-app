const pool = require("../config/db");
const sanitizeHtml = require("sanitize-html");

// 1. Create a Post (Protected with Cloudinary image upload)
exports.createPost = async (req, res, next) => {
  try {
    const { content, media_url } = req.body;
    const userId = req.user.id; // From our auth middleware

    // Validate that the user actually wrote some content
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

    // Frontend se Cloudinary URL seedha aata hai
    let finalImageUrl = null;
    if (media_url && media_url.trim() !== "") {
      finalImageUrl = media_url;
    }

    // Insert directly into database matching schema updates
    const result = await pool.query(
      `INSERT INTO posts (user_id, content, image_url)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, content, image_url, created_at`,
      [userId, cleanContent, finalImageUrl],
    );

    res.status(201).json({ post: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// 2. Get Feed / All Posts (Includes author details & counts)
exports.getFeed = async (req, res, next) => {
  try {
    // Optional auth — agar token ho to liked_by_user bhi return karo
    let currentUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const jwt = require("jsonwebtoken");
        const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
        currentUserId = decoded.id;
      } catch (_) {}
    }

    const result = await pool.query(
      `SELECT 
        p.id, 
        p.content, 
        p.image_url, 
        p.created_at,
        u.id AS author_id,
        u.username AS author_username,
        u.avatar_url AS author_avatar,
        COUNT(DISTINCT l.user_id)::int AS likes_count,
        COUNT(DISTINCT c.id)::int AS comments_count,
        CASE WHEN $1::int IS NOT NULL THEN
          EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1::int)
        ELSE false END AS liked_by_user
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      GROUP BY p.id, u.id
      ORDER BY p.created_at DESC`,
      [currentUserId]
    );

    res.status(200).json({ posts: result.rows });
  } catch (err) {
    next(err);
  }
};

// 3. Edit Post (Protected)
exports.editPost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = Number(req.user.id);
    const { content } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ error: { message: "Content cannot be empty" } });
    }

    const postQuery = await pool.query("SELECT user_id FROM posts WHERE id = $1", [postId]);
    if (postQuery.rows.length === 0) {
      return res.status(404).json({ error: { message: "Post not found" } });
    }
    if (postQuery.rows[0].user_id !== userId) {
      return res.status(403).json({ error: { message: "Unauthorized" } });
    }

    const cleanContent = sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} });
    const result = await pool.query(
      `UPDATE posts SET content = $1 WHERE id = $2 RETURNING id, content, image_url, created_at`,
      [cleanContent, postId]
    );

    res.status(200).json({ post: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// 4. Delete Post
exports.deletePost = async (req, res, next) => {
  try {
    const postId = req.params.id;

    // FORCE cast the authenticated user's ID to a Number
    const userId = Number(req.user.id);

    // Fail early if the session token somehow contains a corrupted or missing ID
    if (isNaN(userId)) {
      return res
        .status(401)
        .json({ error: { message: "Invalid user session" } });
    }

    // Check if post exists and who owns it
    const postQuery = await pool.query(
      "SELECT user_id FROM posts WHERE id = $1",
      [postId],
    );

    if (postQuery.rows.length === 0) {
      return res.status(404).json({ error: { message: "Post not found" } });
    }

    // Compare integers safely
    if (postQuery.rows[0].user_id !== userId) {
      return res
        .status(403)
        .json({ error: { message: "Unauthorized to delete this post" } });
    }

    // Delete the post
    await pool.query("DELETE FROM posts WHERE id = $1", [postId]);

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// 4. Get Personalized Feed (Protected)
exports.getHomeFeed = async (req, res, next) => {
  try {
    const userId = req.user.id; // Logged-in user ID from auth gateway

    const result = await pool.query(
      `SELECT 
        p.id, 
        p.content, 
        p.image_url, 
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
