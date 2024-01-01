require("dotenv").config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 5000,
  MONGODB_URI:
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/microlearning-platform",

  // Azure OpenAI configuration
  AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  AZURE_OPENAI_API_VERSION:
    process.env.AZURE_OPENAI_API_VERSION || "2023-12-01-preview",

  // Azure Blob Storage configuration
  AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING,
  AZURE_STORAGE_CONTAINER_NAME:
    process.env.AZURE_STORAGE_CONTAINER_NAME || "lecture-content",

  // Azure Speech Service configuration
  AZURE_SPEECH_KEY: process.env.AZURE_SPEECH_KEY,
  AZURE_SPEECH_REGION: process.env.AZURE_SPEECH_REGION || "eastus",

  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET || "microlearning-secret-key",
  JWT_EXPIRE: process.env.JWT_EXPIRE || "30d",

  // Vector database configuration
  VECTOR_DB_URL: process.env.VECTOR_DB_URL || "http://localhost:6333",

  // Embedding model configuration
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || "text-embedding-ada-002",

  // Application specific configuration
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ["application/pdf"],

  // Debug mode
  DEBUG: process.env.DEBUG === "true",
};
