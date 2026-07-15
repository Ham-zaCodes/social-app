// controllers/comments.controller.js
const pool = require("../config/db");
const sanitizeHtml = require("sanitize-html");

// 1. Add a Comment to a Post (Protected)
exports.addComment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id; // Post ID being commented on
    const { content } = req.body;

    if (!content || content.trim() === "") {
      return res
        .status(400)
        .json({ error: { message: "Comment content cannot be empty" } });
    }

    // Sanitize the comment content to strip out any <script> tags or harmful HTML
    const cleanContent = sanitizeHtml(content, {
      allowedTags: [], // We don't want to allow ANY HTML tags in standard comments
      allowedAttributes: {}, // Strip all attributes
    });

    // Verify post exists first
    const postCheck = await pool.query("SELECT id FROM posts WHERE id = $1", [
      postId,
    ]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: { message: "Post not found" } });
    }

    const result = await pool.query(
      `INSERT INTO comments (user_id, post_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, post_id, content, created_at`,
      [userId, postId, cleanContent], // <-- Updated to use cleanContent
    );

    res.status(201).json({ comment: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// 2. Get All Comments for a Post (Public)
exports.getComments = async (req, res, next) => {
  try {
    const postId = req.params.id;

    const result = await pool.query(
      `SELECT 
        c.id, 
        c.content, 
        c.created_at, 
        u.id AS user_id, 
        u.username, 
        u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [postId],
    );

    res.status(200).json({ comments: result.rows });
  } catch (err) {
    next(err);
  }
};
