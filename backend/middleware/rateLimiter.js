// middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");

// 1. Auth Limiter: Aggressive protection against brute-force attacks on Login/Register
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Strictly limit to 5 attempts per 15 minutes
  message: {
    error: {
      message:
        "Too many login or registration attempts. Please try again after 15 minutes.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Global Limiter: General protection for all other endpoints
exports.globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    error: {
      message:
        "Too many requests from this IP, please try again after 15 minutes.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
