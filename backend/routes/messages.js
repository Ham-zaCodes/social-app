// routes/messages.routes.js
const express = require("express");
const router = express.Router();
const messagesController = require("../controllers/messages.controller");
const protect = require("../middleware/auth"); // Protects endpoints and exposes req.user

// Get active inbox rooms for logged-in user
router.get("/rooms", protect, messagesController.getRooms);

// Load thread history for a dynamic room
router.get("/room/:roomId", protect, messagesController.getRoomMessages);

// Start a chat or send a dynamic message
router.post("/send", protect, messagesController.sendMessage);

module.exports = router;
