const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const authController = require("../controllers/auth.controller");
const { loginLimiter } = require("../middleware/rateLimiter");

// Register route - Protected against brute-force account creation attempts
router.post(
  "/register",
  loginLimiter, // Injected here to prevent registration spamming
  [
    body("username")
      .isLength({ min: 3, max: 30 })
      .withMessage("Username must be between 3 and 30 characters")
      .trim()
      .escape(),
    body("email")
      .isEmail()
      .withMessage("Provide a valid email address")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(/\d/)
      .withMessage("Password must contain at least one number"),
  ],
  validate,
  authController.register,
);

// Login route - Protected against credential-stuffing/brute-force attacks
router.post(
  "/login",
  loginLimiter,
  [
    body("email")
      .isEmail()
      .withMessage("Provide a valid email address")
      .normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  authController.login,
);

router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

module.exports = router;
