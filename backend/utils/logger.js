  const winston = require("winston");
  const config = require("../config/env");

  // Define log format
  const logFormat = winston.format.printf(
    ({ level, message, timestamp, ...meta }) => {
      return `${timestamp} ${level}: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta) : ""
      }`;
    }
  );

  // Configure logger
  const logger = winston.createLogger({
    level: config.DEBUG ? "debug" : "info",
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: { service: "microlearning-platform" },
    transports: [
      // Write all logs with level 'error' and below to 'error.log'
      new winston.transports.File({ filename: "logs/error.log", level: "error" }),
      // Write all logs with level 'info' and below to 'combined.log'
      new winston.transports.File({ filename: "logs/combined.log" }),
    ],
  });

  // If we're not in production, log to the console with custom format
  if (config.NODE_ENV !== "production") {
    logger.add(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          logFormat
        ),
      })
    );
  }

  // Stream for Morgan
  const stream = {
    write: (message) => logger.info(message.trim()),
  };

  module.exports = { logger, stream };
