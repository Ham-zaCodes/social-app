const jwt = require("jsonwebtoken");
const pool = require("../config/db");

module.exports = async (req, res, next) => {
  console.log("Headers received:", req.headers);
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: { message: "No token provided" } });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user exists inside Neon
    const userQuery = await pool.query(
      "SELECT id, username, email FROM users WHERE id = $1",
      [decoded.id],
    );

    if (userQuery.rows.length === 0) {
      return res
        .status(401)
        .json({ error: { message: "User account no longer exists" } });
    }

    req.user = userQuery.rows[0]; // { id, username, email }
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ error: { message: "Invalid or expired token" } });
  }
};
