// controllers/auth.controller.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// Centralized cookie configuration to keep setting and clearing perfectly symmetrical
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "None", // Cross-domain cookie ke liye zaroori (frontend aur backend alag domains)
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Decoded JWT payload shape matches on both login and silent refresh
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email, username],
    );
    if (existing.rows.length > 0) {
      return res
        .status(409)
        .json({ error: { message: "Username or email already in use" } });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username, email, passwordHash],
    );

    const user = result.rows[0];
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];

    if (!user) {
      return res
        .status(401)
        .json({ error: { message: "Invalid email or password" } });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res
        .status(401)
        .json({ error: { message: "Invalid email or password" } });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set the cookie using our secure options
    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      accessToken,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    return res
      .status(401)
      .json({ error: { message: "No refresh token provided" } });
  }

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET);

    // Fetch up-to-date user data to keep token payloads symmetrical
    const result = await pool.query(
      "SELECT id, username, email FROM users WHERE id = $1",
      [decoded.id],
    );
    const user = result.rows[0];

    if (!user) {
      // Pass identical COOKIE_OPTIONS (excluding maxAge) so modern browsers let us clear it
      const { maxAge, ...clearOptions } = COOKIE_OPTIONS;
      res.clearCookie("refreshToken", clearOptions);
      return res
        .status(401)
        .json({ error: { message: "User account no longer exists" } });
    }

    const accessToken = generateAccessToken(user);
    res.status(200).json({ accessToken });
  } catch (err) {
    // Clean up expired tokens on error
    const { maxAge, ...clearOptions } = COOKIE_OPTIONS;
    res.clearCookie("refreshToken", clearOptions);
    return res
      .status(401)
      .json({ error: { message: "Invalid or expired refresh token" } });
  }
};

exports.logout = (req, res) => {
  // Strip maxAge to cleanly wipe out the session cookie across all modern engines
  const { maxAge, ...clearOptions } = COOKIE_OPTIONS;
  res.clearCookie("refreshToken", clearOptions);
  res.status(200).json({ message: "Logged out successfully" });
};
