require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const cors = require("cors");
require("./config/db");

const authRoutes = require("./routes/auth.routes");
const { globalLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");
const postRoutes = require("./routes/post.routes");
const followRoutes = require("./routes/follow.routes");
const commentsRoutes = require("./routes/comments.routes");
const likesRoutes = require("./routes/likes.routes");
const usersRoutes = require("./routes/users.routes");

const app = express();

app.set("trust proxy", 1);

app.use(helmet());

// UPDATE THIS LINE: Allow your frontend running on port 3000
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5500"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use(globalLimiter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Root route handler
app.get("/", (req, res) => {
  res.status(200).json({ message: "Server is up and running" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/post", postRoutes);
app.use("/api/post", commentsRoutes);
app.use("/api/post", likesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/users", followRoutes);

app.use(errorHandler);

module.exports = app;
