// server.js
require("dotenv").config(); // 1. Run this FIRST!

const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const cors = require("cors");
require("./config/db"); // Successfully reads the loaded environment variables

const authRoutes = require("./routes/auth.routes");
const { globalLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");
const postRoutes = require("./routes/post.routes");
const followRoutes = require("./routes/follow.routes");
const commentsRoutes = require("./routes/comments.routes");
const likesRoutes = require("./routes/likes.routes");
const usersRoutes = require("./routes/users.routes");

const app = express();

// Trust proxy header for rate limiting accuracy behind CDNs/Proxies (e.g., Render, Heroku)
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: "http://localhost:5500", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(globalLimiter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/post", postRoutes);
app.use("/api/post", commentsRoutes);
app.use("/api/post", likesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/users", followRoutes);

app.use(errorHandler); // Global error middleware catches everything

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
