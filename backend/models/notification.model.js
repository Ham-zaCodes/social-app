const pool = require("../config/db");

exports.createNotification = async (
  recipientId,
  senderId,
  type,
  postId = null,
) => {
  try {
    // Apne aap ko notifications bhejna skip karein
    if (recipientId === senderId) return;

    await pool.query(
      `INSERT INTO notifications (recipient_id, sender_id, type, post_id)
       VALUES ($1, $2, $3, $4)`,
      [recipientId, senderId, type, postId],
    );
  } catch (err) {
    console.error("Failed to trigger notification:", err);
  }
};
