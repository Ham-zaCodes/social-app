require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("./config/db");

const authRoutes = require("./routes/auth.routes");
const { globalLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");
const postRoutes = require("./routes/post.routes");
const followRoutes = require("./routes/follow.routes");
const commentsRoutes = require("./routes/comments.routes");
const likesRoutes = require("./routes/likes.routes");
const usersRoutes = require("./routes/users.routes");
//const messageRoutes = require("./routes/messages.routes"); // ADDED: Direct Messages Routes

const app = express();

app.set("trust proxy", 1);

// Configure Helmet (Adjusted to allow rendering static upload images if served locally)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

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

// --- STATIC FILES & UPLOAD CONFIGURATION ---
// Ensure the local upload folder exists dynamically on startup
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files statically so frontend can access them (e.g., http://localhost:PORT/uploads/filename)
app.use("/uploads", express.static(uploadDir));
// -------------------------------------------

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
//app.use("/api/messages", messageRoutes); // ADDED: Direct Messages Routing

app.use(errorHandler);

module.exports = app;
