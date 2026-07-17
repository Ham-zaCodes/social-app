// middleware/errorHandler.js

module.exports = (err, req, res, next) => {
  console.error("--- SYSTEM ERROR ---");
  console.error(err);
  console.error("--------------------");

  const status = err.status || 500;
  const message = err.message || "An internal server error occurred";

  res.status(status).json({
    error: { message, stack: err.stack },
  });
};
