const pool = require("../config/db");

exports.createNotification = async (recipientId, senderId, type, postId = null, messageText = null) => {
  try {
    if (recipientId === senderId) return;

    await pool.query(
      `INSERT INTO notifications (receiver_id, sender_id, type, entity_id, message_text)
       VALUES ($1, $2, $3, $4, $5)`,
      [recipientId, senderId, type, postId, messageText],
    );
  } catch (err) {
    console.error("Failed to trigger notification:", err);
  }
};
