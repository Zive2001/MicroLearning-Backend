const { BlobServiceClient } = require("@azure/storage-blob");
const { OpenAIClient } = require("@azure/openai");
const { AzureKeyCredential } = require("@azure/core-auth");
const { logger } = require("../utils/logger");
const config = require("./env");

/**
 * Azure Blob Storage configuration
 */
const blobServiceClient = BlobServiceClient.fromConnectionString(
  config.AZURE_STORAGE_CONNECTION_STRING
);

/**
 * Get or create a container in Azure Blob Storage
 * @param {string} containerName - Name of the container
 * @returns {Promise<ContainerClient>} - Container client
 */
const getOrCreateContainer = async (
  containerName = config.AZURE_STORAGE_CONTAINER_NAME
) => {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Check if container exists
    const exists = await containerClient.exists();

    if (!exists) {
      logger.info(`Creating container: ${containerName}`);
      await containerClient.create();
    }

    return containerClient;
  } catch (error) {
    logger.error(
      `Error getting or creating container ${containerName}:`,
      error
    );
    throw error;
  }
};

/**
 * Azure OpenAI configuration
 */
const openAIClient = new OpenAIClient(
  config.AZURE_OPENAI_ENDPOINT,
  new AzureKeyCredential(config.AZURE_OPENAI_API_KEY)
);

/**
 * Generate completions using Azure OpenAI
 * @param {string} prompt - Prompt for completion
 * @param {Object} options - Additional options
 * @returns {Promise<string>} - Generated completion
 */
const generateCompletion = async (prompt, options = {}) => {
  try {
    const defaultOptions = {
      deploymentName: config.AZURE_OPENAI_DEPLOYMENT_NAME,
      maxTokens: 1000,
      temperature: 0.7,
      topP: 0.95,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stopSequences: [],
    };

    const requestOptions = { ...defaultOptions, ...options };

    const { choices } = await openAIClient.getCompletions(
      requestOptions.deploymentName,
      [prompt],
      requestOptions
    );

    return choices[0].text.trim();
  } catch (error) {
    logger.error("Error generating completion:", error);
    throw error;
  }
};

/**
 * Generate chat completions using Azure OpenAI
 * @param {Array<Object>} messages - Array of messages for the chat
 * @param {Object} options - Additional options
 * @returns {Promise<string>} - Generated completion
 */
const generateChatCompletion = async (messages, options = {}) => {
  try {
    const defaultOptions = {
      deploymentName: config.AZURE_OPENAI_DEPLOYMENT_NAME,
      maxTokens: 1000,
      temperature: 0.7,
      topP: 0.95,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stopSequences: [],
    };

    const requestOptions = { ...defaultOptions, ...options };

    const { choices } = await openAIClient.getChatCompletions(
      requestOptions.deploymentName,
      messages,
      requestOptions
    );

    return choices[0].message.content.trim();
  } catch (error) {
    logger.error("Error generating chat completion:", error);
    throw error;
  }
};

module.exports = {
  blobServiceClient,
  getOrCreateContainer,
  openAIClient,
  generateCompletion,
  generateChatCompletion,
};
