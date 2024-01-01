const mongoose = require("mongoose");
const { logger } = require("../utils/logger");
const config = require("./env");

/**
 * Connect to MongoDB
 * @returns {Promise} - Mongoose connection promise
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    throw error;
  }
};

/**
 * Close MongoDB connection
 * @returns {Promise} - Mongoose disconnect promise
 */
const closeDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info("MongoDB connection closed");
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
    throw error;
  }
};

module.exports = {
  connectDB,
  closeDB,
};
