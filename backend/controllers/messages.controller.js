// controllers/messages.controller.js
const pool = require("../config/db"); // Verified DB config connection path

// 1. Get active inbox rooms for logged-in user
exports.getRooms = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT cr.id as room_id, 
              (SELECT u.username FROM chat_room_members crm JOIN users u ON u.id = crm.user_id WHERE crm.room_id = cr.id AND crm.user_id != $1 LIMIT 1) as recipient_username,
              (SELECT u.avatar_url FROM chat_room_members crm JOIN users u ON u.id = crm.user_id WHERE crm.room_id = cr.id AND crm.user_id != $1 LIMIT 1) as recipient_avatar,
              (SELECT message_text FROM messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM chat_rooms cr
       JOIN chat_room_members crm ON crm.room_id = cr.id
       WHERE crm.user_id = $1`,
      [req.user.id],
    );
    res.status(200).json(result.rows);
  } catch (err) {
    next(err); // Hands control off to your global express error handler
  }
};

// 2. Load thread history for a dynamic room
exports.getRoomMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    // Strict validation of URL parameter
    if (!roomId) {
      return res
        .status(400)
        .json({ error: { message: "Room ID is required" } });
    }

    const messages = await pool.query(
      `SELECT m.*, u.username as sender_username 
       FROM messages m 
       JOIN users u ON m.sender_id = u.id 
       WHERE m.room_id = $1 
       ORDER BY m.created_at ASC`,
      [roomId],
    );
    res.status(200).json(messages.rows);
  } catch (err) {
    next(err);
  }
};

// 3. Start a chat or send a dynamic message
exports.sendMessage = async (req, res, next) => {
  const { recipientId, messageText } = req.body;
  const senderId = req.user.id;

  // Strict request body verification
  if (!recipientId || !messageText || messageText.trim() === "") {
    return res.status(400).json({
      error: { message: "Recipient ID and message content are required" },
    });
  }

  try {
    // Check if an active chat room already exists between these 2 users
    let roomCheck = await pool.query(
      `SELECT room_id FROM chat_room_members 
       WHERE user_id IN ($1, $2) 
       GROUP BY room_id HAVING COUNT(DISTINCT user_id) = 2`,
      [senderId, recipientId],
    );

    let roomId;
    if (roomCheck.rows.length > 0) {
      roomId = roomCheck.rows[0].room_id;
    } else {
      // Create new DM room
      const newRoom = await pool.query(
        "INSERT INTO chat_rooms DEFAULT VALUES RETURNING id",
      );
      roomId = newRoom.rows[0].id;

      // Associate both users with the newly created room securely
      await pool.query(
        "INSERT INTO chat_room_members (room_id, user_id) VALUES ($1, $2), ($1, $3)",
        [roomId, senderId, recipientId],
      );
    }

    // Insert the actual message log into the newly resolved/retrieved room
    const message = await pool.query(
      `INSERT INTO messages (room_id, sender_id, message_text) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [roomId, senderId, messageText],
    );

    res.status(201).json(message.rows[0]);
  } catch (err) {
    next(err);
  }
};
