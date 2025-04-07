// utils/openaiConfig.js
const { OpenAI } = require('openai');
require('dotenv').config();

// Initialize OpenAI API with retry logic
const createOpenAIClient = () => {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 3,
    timeout: 60000 // 60 seconds
  });
  
  return client;
};

module.exports = createOpenAIClient;