// middleware/errorHandler.js

module.exports = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";

  // 1. Always log the full error details to your terminal console for developer eyes
  console.error("--- SYSTEM ERROR ---");
  console.error(err);
  console.error("--------------------");

  const status = err.status || 500;

  // 2. Determine the message based on environment and status code
  let message = err.message;
  if (isProduction && status === 500) {
    message = "An internal server error occurred"; // Keeps database/schema details masked
  }

  // 3. Send the response
  res.status(status).json({
    error: {
      message,
      // Only include the detailed stack trace when NOT in production
      ...(!isProduction && { stack: err.stack }),
    },
  });
};
