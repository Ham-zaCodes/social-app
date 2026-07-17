module.exports = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";

  console.error("--- SYSTEM ERROR ---");
  console.error(err);
  console.error("--------------------");

  const status = err.status || 500;
  const message =
    isProduction && status === 500
      ? "An internal server error occurred"
      : err.message;

  res.status(status).json({
    error: {
      message,
      ...(!isProduction && { stack: err.stack }),
    },
  });
};
