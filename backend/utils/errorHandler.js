const { logger } = require("./logger");
const config = require("../config/env");

/**
 * Global error handler middleware for Express
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error("Error occurred:", {
    message: err.message,
    stack: config.NODE_ENV === "development" ? err.stack : null,
    path: req.path,
    method: req.method,
  });

  // Set default error status and message
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Create error response
  const errorResponse = {
    success: false,
    error: message,
    stack: config.NODE_ENV === "development" ? err.stack : null,
  };

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Custom error class with status code
 */
class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = errorHandler;
module.exports.ApiError = ApiError;
