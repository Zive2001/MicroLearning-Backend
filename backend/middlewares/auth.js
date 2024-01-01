const jwt = require("jsonwebtoken");
const { ApiError } = require("../utils/errorHandler");
const { logger } = require("../utils/logger");
const User = require("../models/User");
const config = require("../config/env");

/**
 * Protect routes - Middleware to verify JWT token and attach user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      // Get token from cookie
      token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
      return next(new ApiError("Not authorized to access this route", 401));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.JWT_SECRET);

      // Attach user to request
      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return next(new ApiError("User not found", 404));
      }

      next();
    } catch (error) {
      logger.error("Error verifying JWT token:", error);
      return next(new ApiError("Not authorized to access this route", 401));
    }
  } catch (error) {
    logger.error("Error in auth middleware:", error);
    next(error);
  }
};

/**
 * Authorize specific roles - Middleware to authorize specific user roles
 * @param  {...string} roles - Roles to authorize
 * @returns {Function} - Express middleware function
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError("User not authenticated", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }

    next();
  };
};
