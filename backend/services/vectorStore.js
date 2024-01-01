const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { FaissStore } = require("langchain/vectorstores/faiss");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { logger } = require("../utils/logger");
const config = require("../config/env");
const fs = require("fs");
const path = require("path");

/**
 * Service to handle vector storage and retrieval operations
 */
class VectorStoreService {
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

    // Ensure the vector store directory exists
    this.vectorStoreDir = path.join(__dirname, "../data/vector_store");
    if (!fs.existsSync(this.vectorStoreDir)) {
      fs.mkdirSync(this.vectorStoreDir, { recursive: true });
    }
  }

  /**
   * Create text splitter for chunking documents
   * @param {number} chunkSize - Size of each chunk
   * @param {number} chunkOverlap - Overlap between chunks
   * @returns {RecursiveCharacterTextSplitter} - Configured text splitter
   */
  createTextSplitter(chunkSize = 1000, chunkOverlap = 200) {
    return new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ["\n\n", "\n", ". ", "! ", "? ", ";", ":", " ", ""],
    });
  }

  /**
   * Create a vector store from documents
   * @param {Array<string>} documents - Array of text documents
   * @param {string} namespace - Namespace for the vector store
   * @returns {Promise<string>} - Path to the created vector store
   */
  async createVectorStore(documents, namespace) {
    try {
      // Create a text splitter
      const textSplitter = this.createTextSplitter();

      // Split the documents into chunks
      const chunks = await textSplitter.createDocuments(documents);

      logger.info(
        `Created ${chunks.length} chunks from ${documents.length} documents for namespace: ${namespace}`
      );

      // Create a vector store from the chunks
      const vectorStore = await FaissStore.fromDocuments(
        chunks,
        this.embeddingsModel
      );

      // Save the vector store
      const storePath = path.join(this.vectorStoreDir, namespace);
      await vectorStore.save(storePath);

      logger.info(`Vector store created and saved to ${storePath}`);

      return storePath;
    } catch (error) {
      logger.error(
        `Error creating vector store for namespace ${namespace}:`,
        error
      );
      throw new Error("Failed to create vector store");
    }
  }

  /**
   * Load a vector store by namespace
   * @param {string} namespace - Namespace of the vector store to load
   * @returns {Promise<FaissStore>} - Loaded vector store
   */
  async loadVectorStore(namespace) {
    try {
      const storePath = path.join(this.vectorStoreDir, namespace);

      if (!fs.existsSync(storePath)) {
        throw new Error(
          `Vector store for namespace ${namespace} does not exist`
        );
      }

      const vectorStore = await FaissStore.load(
        storePath,
        this.embeddingsModel
      );

      logger.info(`Vector store loaded from ${storePath}`);

      return vectorStore;
    } catch (error) {
      logger.error(
        `Error loading vector store for namespace ${namespace}:`,
        error
      );
      throw new Error("Failed to load vector store");
    }
  }

  /**
   * Search for similar documents in the vector store
   * @param {string} query - The search query
   * @param {string} namespace - Namespace of the vector store to search
   * @param {number} k - Number of results to return
   * @returns {Promise<Array<Object>>} - Array of similar documents with scores
   */
  async similaritySearch(query, namespace, k = 5) {
    try {
      const vectorStore = await this.loadVectorStore(namespace);
      const results = await vectorStore.similaritySearchWithScore(query, k);

      return results.map(([doc, score]) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        score: score,
      }));
    } catch (error) {
      logger.error(
        `Error performing similarity search in namespace ${namespace}:`,
        error
      );
      throw new Error("Failed to perform similarity search");
    }
  }

  /**
   * Generate embeddings for a single text
   * @param {string} text - Text to embed
   * @returns {Promise<Array<number>>} - Embedding vector
   */
  async generateEmbedding(text) {
    try {
      const embedding = await this.embeddingsModel.embedQuery(text);
      return embedding;
    } catch (error) {
      logger.error("Error generating embedding:", error);
      throw new Error("Failed to generate embedding");
    }
  }

  /**
   * Generate embeddings for multiple texts
   * @param {Array<string>} texts - Array of texts to embed
   * @returns {Promise<Array<Array<number>>>} - Array of embedding vectors
   */
  async generateEmbeddings(texts) {
    try {
      const embeddings = await this.embeddingsModel.embedDocuments(texts);
      return embeddings;
    } catch (error) {
      logger.error("Error generating embeddings:", error);
      throw new Error("Failed to generate embeddings");
    }
  }

  /**
   * Update an existing vector store with new documents
   * @param {Array<string>} documents - Array of new text documents
   * @param {string} namespace - Namespace of the vector store to update
   * @returns {Promise<string>} - Path to the updated vector store
   */
  async updateVectorStore(documents, namespace) {
    try {
      // Load existing vector store if it exists
      let vectorStore;
      const storePath = path.join(this.vectorStoreDir, namespace);

      if (fs.existsSync(storePath)) {
        vectorStore = await this.loadVectorStore(namespace);
      } else {
        // If it doesn't exist, create a new one
        return this.createVectorStore(documents, namespace);
      }

      // Create a text splitter
      const textSplitter = this.createTextSplitter();

      // Split the documents into chunks
      const chunks = await textSplitter.createDocuments(documents);

      logger.info(
        `Adding ${chunks.length} new chunks to vector store for namespace: ${namespace}`
      );

      // Add the new chunks to the vector store
      await vectorStore.addDocuments(chunks);

      // Save the updated vector store
      await vectorStore.save(storePath);

      logger.info(`Vector store updated and saved to ${storePath}`);

      return storePath;
    } catch (error) {
      logger.error(
        `Error updating vector store for namespace ${namespace}:`,
        error
      );
      throw new Error("Failed to update vector store");
    }
  }
}

module.exports = new VectorStoreService();
