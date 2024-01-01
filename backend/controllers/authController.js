const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { ApiError } = require("../utils/errorHandler");
const { logger } = require("../utils/logger");
const User = require("../models/User");
const config = require("../config/env");

/**
 * Controller for authentication operations
 */
const authController = {
  /**
   * Register a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  register: async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return next(new ApiError("User with this email already exists", 400));
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: role || "student", // Default to student if no role provided
      });

      // Generate token
      const token = jwt.sign({ id: user._id }, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRE,
      });

      // Set cookie options
      const cookieOptions = {
        expires: new Date(
          Date.now() + parseInt(config.JWT_EXPIRE) * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: config.NODE_ENV === "production",
      };

      // Send response
      res
        .status(201)
        .cookie("token", token, cookieOptions)
        .json({
          success: true,
          token,
          data: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        });
    } catch (error) {
      logger.error("Error registering user:", error);
      next(error);
    }
  },

  /**
   * Login user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Check if user exists
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ApiError("Invalid credentials", 401));
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return next(new ApiError("Invalid credentials", 401));
      }

      // Generate token
      const token = jwt.sign({ id: user._id }, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRE,
      });

      // Set cookie options
      const cookieOptions = {
        expires: new Date(
          Date.now() + parseInt(config.JWT_EXPIRE) * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: config.NODE_ENV === "production",
      };

      // Send response
      res
        .status(200)
        .cookie("token", token, cookieOptions)
        .json({
          success: true,
          token,
          data: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        });
    } catch (error) {
      logger.error("Error logging in user:", error);
      next(error);
    }
  },

  /**
   * Get current logged in user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getMe: async (req, res, next) => {
    try {
      // User is already attached to req by the protect middleware
      res.status(200).json({
        success: true,
        data: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        },
      });
    } catch (error) {
      logger.error("Error getting current user:", error);
      next(error);
    }
  },

  /**
   * Logout user / clear cookie
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  logout: async (req, res, next) => {
    try {
      res.cookie("token", "none", {
        expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
        httpOnly: true,
      });

      res.status(200).json({
        success: true,
        data: {},
      });
    } catch (error) {
      logger.error("Error logging out user:", error);
      next(error);
    }
  },

  /**
   * Update user details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  updateDetails: async (req, res, next) => {
    try {
      const fieldsToUpdate = {
        name: req.body.name,
        email: req.body.email,
      };

      // Remove undefined fields
      Object.keys(fieldsToUpdate).forEach(
        (key) => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
      );

      // Update user
      const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true,
      });

      res.status(200).json({
        success: true,
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error("Error updating user details:", error);
      next(error);
    }
  },

  /**
   * Update password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  updatePassword: async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Check if passwords are provided
      if (!currentPassword || !newPassword) {
        return next(
          new ApiError("Please provide current and new password", 400)
        );
      }

      // Get user with password
      const user = await User.findById(req.user.id).select("+password");

      // Check current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);

      if (!isMatch) {
        return next(new ApiError("Current password is incorrect", 401));
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password
      user.password = hashedPassword;
      await user.save();

      // Generate new token
      const token = jwt.sign({ id: user._id }, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRE,
      });

      // Set cookie options
      const cookieOptions = {
        expires: new Date(
          Date.now() + parseInt(config.JWT_EXPIRE) * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: config.NODE_ENV === "production",
      };

      // Send response
      res.status(200).cookie("token", token, cookieOptions).json({
        success: true,
        token,
      });
    } catch (error) {
      logger.error("Error updating password:", error);
      next(error);
    }
  },
};

module.exports = authController;
