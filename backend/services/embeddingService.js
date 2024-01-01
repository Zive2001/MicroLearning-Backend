const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { logger } = require("../utils/logger");
const config = require("../config/env");

/**
 * Service to handle text embedding operations
 */
class EmbeddingService {
  constructor() {
    this.embeddingsModel = new OpenAIEmbeddings({
      azureOpenAIApiKey: config.AZURE_OPENAI_API_KEY,
      azureOpenAIApiVersion: config.AZURE_OPENAI_API_VERSION,
      azureOpenAIApiInstanceName: config.AZURE_OPENAI_ENDPOINT.replace(
        "https://",
        ""
      ).replace(".openai.azure.com/", ""),
      azureOpenAIApiDeploymentName: config.EMBEDDING_MODEL,
      maxRetries: 3,
    });
  }

  /**
   * Generate embeddings for a single text
   * @param {string} text - Text to embed
   * @returns {Promise<Array<number>>} - Embedding vector
   */
  async embedText(text) {
    try {
      const embedding = await this.embeddingsModel.embedQuery(text);
      return embedding;
    } catch (error) {
      logger.error("Error embedding text:", error);
      throw new Error("Failed to embed text");
    }
  }

  /**
   * Generate embeddings for multiple texts
   * @param {Array<string>} texts - Array of texts to embed
   * @returns {Promise<Array<Array<number>>>} - Array of embedding vectors
   */
  async embedTexts(texts) {
    try {
      const embeddings = await this.embeddingsModel.embedDocuments(texts);
      return embeddings;
    } catch (error) {
      logger.error("Error embedding multiple texts:", error);
      throw new Error("Failed to embed multiple texts");
    }
  }

  /**
   * Compute similarity between two embedding vectors
   * @param {Array<number>} embedding1 - First embedding vector
   * @param {Array<number>} embedding2 - Second embedding vector
   * @returns {number} - Cosine similarity score (between -1 and 1)
   */
  computeSimilarity(embedding1, embedding2) {
    try {
      if (
        !embedding1 ||
        !embedding2 ||
        embedding1.length !== embedding2.length
      ) {
        throw new Error("Invalid embeddings for similarity computation");
      }

      // Compute dot product
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        norm1 += embedding1[i] * embedding1[i];
        norm2 += embedding2[i] * embedding2[i];
      }

      norm1 = Math.sqrt(norm1);
      norm2 = Math.sqrt(norm2);

      // Compute cosine similarity
      if (norm1 === 0 || norm2 === 0) {
        return 0;
      }

      return dotProduct / (norm1 * norm2);
    } catch (error) {
      logger.error("Error computing similarity between embeddings:", error);
      throw new Error("Failed to compute similarity between embeddings");
    }
  }

  /**
   * Find the most similar texts from a list
   * @param {string} queryText - Text to compare against
   * @param {Array<string>} candidateTexts - Array of candidate texts
   * @param {number} topK - Number of most similar texts to return
   * @returns {Promise<Array<{text: string, similarity: number}>>} - Array of texts with similarity scores
   */
  async findMostSimilarTexts(queryText, candidateTexts, topK = 3) {
    try {
      // Embed the query text
      const queryEmbedding = await this.embedText(queryText);

      // Embed all candidate texts
      const candidateEmbeddings = await this.embedTexts(candidateTexts);

      // Compute similarities
      const similarities = candidateEmbeddings.map((embedding, index) => ({
        text: candidateTexts[index],
        similarity: this.computeSimilarity(queryEmbedding, embedding),
      }));

      // Sort by similarity (descending) and return top K
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
    } catch (error) {
      logger.error("Error finding most similar texts:", error);
      throw new Error("Failed to find most similar texts");
    }
  }

  /**
   * Check if two texts are semantically similar
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @param {number} threshold - Similarity threshold (0 to 1)
   * @returns {Promise<boolean>} - Whether the texts are similar
   */
  async areTextsSimilar(text1, text2, threshold = 0.8) {
    try {
      const embedding1 = await this.embedText(text1);
      const embedding2 = await this.embedText(text2);

      const similarity = this.computeSimilarity(embedding1, embedding2);

      return similarity >= threshold;
    } catch (error) {
      logger.error("Error checking if texts are similar:", error);
      throw new Error("Failed to check if texts are similar");
    }
  }
}

module.exports = new EmbeddingService();
