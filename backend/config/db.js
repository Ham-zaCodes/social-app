// config/db.js
const { Pool } = require("pg");

console.log("DATABASE URL DETECTED IN DB.JS:", process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error(
    "FATAL ERROR: DATABASE_URL is not defined in your environment variables!",
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // REQUIRED for Neon's cloud serverless Postgres
  },
});

// Test connection
pool
  .connect()
  .then(() => console.log("Successfully connected to Neon PostgreSQL!"))
  .catch((err) => console.error("Database connection failure:", err));

module.exports = pool;
