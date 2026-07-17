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
//const messageRoutes = require("./routes/messages.routes"); // Disabled temporarily to prevent missing file crashes

const app = express();

app.set("trust proxy", 1);

// Configure Helmet (Adjusted to allow rendering static upload images if served locally)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Comprehensive CORS configuration to handle routing, credentials, and preflight OPTIONS automatically
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001", // Fallback for busy local ports
      "http://localhost:5500",
      "https://social-app-nine-zeta.vercel.app", // Your frontend domain
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use(globalLimiter);

// --- STATIC FILES & UPLOAD CONFIGURATION ---
// Bypassed on production to avoid read-only filesystem crash on Vercel
const uploadDir = path.join(__dirname, "uploads");
if (process.env.NODE_ENV !== "production") {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

// Serve uploaded files statically
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
//app.use("/api/messages", messageRoutes); // Disabled temporarily to prevent missing file crashes

app.use(errorHandler);

module.exports = app;
