// controllers/messages.controller.js
const pool = require("../config/db");

// 1. Get active inbox rooms for logged-in user
exports.getRooms = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT cr.id as room_id, 
              (SELECT u.username FROM chat_room_members crm JOIN users u ON u.id = crm.user_id WHERE crm.room_id = cr.id AND crm.user_id != $1 LIMIT 1) as recipient_username,
              (SELECT u.avatar_url FROM chat_room_members crm JOIN users u ON u.id = crm.user_id WHERE crm.room_id = cr.id AND crm.user_id != $1 LIMIT 1) as recipient_avatar,
              (SELECT message_text FROM messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message_time
       FROM chat_rooms cr
       JOIN chat_room_members crm ON crm.room_id = cr.id
       WHERE crm.user_id = $1
       ORDER BY last_message_time DESC NULLS LAST`, // Rooms ko last active message ke order se arrange kiya
      [userId],
    );
    res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
};

// 2. Load thread history for a dynamic room
exports.getRoomMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res
        .status(400)
        .json({ error: { message: "Room ID is required" } });
    }

    const messages = await pool.query(
      `SELECT m.*, u.username as sender_username, u.avatar_url as sender_avatar 
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

// 3. Start a chat or send a dynamic message (Transactional and Crash-Proof)
exports.sendMessage = async (req, res, next) => {
  const { recipientId, messageText } = req.body;
  const senderId = req.user.id;

  if (!recipientId || !messageText || messageText.trim() === "") {
    return res.status(400).json({
      error: { message: "Recipient ID and message content are required" },
    });
  }

  if (parseInt(senderId) === parseInt(recipientId)) {
    return res.status(400).json({
      error: { message: "You cannot message yourself" },
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let roomCheck = await client.query(
      `SELECT room_id FROM chat_room_members 
       WHERE room_id IN (
         SELECT room_id FROM chat_room_members WHERE user_id = $1
       ) AND user_id = $2
       GROUP BY room_id`,
      [senderId, recipientId],
    );

    let roomId;
    if (roomCheck.rows.length > 0) {
      roomId = roomCheck.rows[0].room_id;
    } else {
      const newRoom = await client.query(
        "INSERT INTO chat_rooms DEFAULT VALUES RETURNING id",
      );
      roomId = newRoom.rows[0].id;
      await client.query(
        "INSERT INTO chat_room_members (room_id, user_id) VALUES ($1, $2), ($1, $3)",
        [roomId, senderId, recipientId],
      );
    }

    const messageResult = await client.query(
      `INSERT INTO messages (room_id, sender_id, message_text) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [roomId, senderId, messageText],
    );

    await client.query("COMMIT");

    // Message notification bhejo
    const { createNotification } = require("../models/notification.model");
    await createNotification(parseInt(recipientId), senderId, "MESSAGE", null, messageText);

    res.status(201).json({ ...messageResult.rows[0], room_id: roomId });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};
