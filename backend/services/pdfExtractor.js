const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const { BlobServiceClient } = require("@azure/storage-blob");
const { logger } = require("../utils/logger");
const config = require("../config/env");

/**
 * Service to handle PDF extraction and processing
 */
class PdfExtractorService {
  constructor() {
    this.containerName = config.AZURE_STORAGE_CONTAINER_NAME;
    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      config.AZURE_STORAGE_CONNECTION_STRING
    );
    this.containerClient = this.blobServiceClient.getContainerClient(
      this.containerName
    );
  }

  /**
   * Process PDF content into structured sections
   * @param {string} textContent - Extracted text from PDF
   * @returns {Object} - Structured content with sections
   */
  processContentIntoSections(textContent) {
    try {
      // Split the content by section headers (typically uppercase or numbered sections)
      const sectionPattern =
        /\n\s*([A-Z\d\.]{1,10}[\s\-\.]*[A-Z][A-Z\s\d\-]{2,})\s*\n/g;
      const sections = [];

      let lastIndex = 0;
      let match;

      // Find all section headers
      while ((match = sectionPattern.exec(textContent)) !== null) {
        if (lastIndex > 0) {
          // Add the previous section's content
          const sectionText = textContent
            .substring(lastIndex, match.index)
            .trim();
          if (sectionText) {
            sections.push({
              title: sections[sections.length - 1].title,
              content: sectionText,
            });
          }
        }

        // Add the new section header
        sections.push({
          title: match[1].trim(),
          content: "",
        });

        lastIndex = match.index + match[0].length;
      }

      // Add the final section's content
      if (lastIndex > 0 && lastIndex < textContent.length) {
        const sectionText = textContent.substring(lastIndex).trim();
        if (sectionText) {
          sections.push({
            title: sections[sections.length - 1].title,
            content: sectionText,
          });
        }
      }

      // If no sections were found, treat the whole document as one section
      if (sections.length === 0) {
        sections.push({
          title: "Document",
          content: textContent.trim(),
        });
      }

      return sections;
    } catch (error) {
      logger.error("Error processing PDF content into sections:", error);
      throw new Error("Failed to process PDF content into sections");
    }
  }

  /**
   * Split content into smaller chunks for better processing
   * @param {string} content - Text content to chunk
   * @param {number} maxChunkSize - Maximum characters per chunk
   * @returns {Array<string>} - Array of content chunks
   */
  splitIntoChunks(content, maxChunkSize = 1500) {
    try {
      const chunks = [];

      // Split by paragraphs first
      const paragraphs = content.split(/\n\s*\n/);

      let currentChunk = "";

      for (const paragraph of paragraphs) {
        // If adding this paragraph exceeds the max chunk size, save current chunk and start a new one
        if (
          currentChunk.length + paragraph.length > maxChunkSize &&
          currentChunk.length > 0
        ) {
          chunks.push(currentChunk.trim());
          currentChunk = "";
        }

        // If a single paragraph is larger than max chunk size, split it further
        if (paragraph.length > maxChunkSize) {
          // Split by sentences
          const sentences = paragraph.split(/(?<=[.!?])\s+/);

          for (const sentence of sentences) {
            if (
              currentChunk.length + sentence.length > maxChunkSize &&
              currentChunk.length > 0
            ) {
              chunks.push(currentChunk.trim());
              currentChunk = "";
            }

            currentChunk += sentence + " ";
          }
        } else {
          currentChunk += paragraph + "\n\n";
        }
      }

      // Add the last chunk if not empty
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }

      return chunks;
    } catch (error) {
      logger.error("Error splitting content into chunks:", error);
      throw new Error("Failed to split content into chunks");
    }
  }

  /**
   * Extract lecture outlines and learning outcomes
   * @param {string} textContent - Extracted text from PDF
   * @returns {Object} - Extracted lecture outlines and learning outcomes
   */
  extractLectureOutlinesAndOutcomes(textContent) {
    try {
      const sections = this.processContentIntoSections(textContent);

      // Look for sections that might contain learning outcomes or objectives
      const learningOutcomes = [];
      let courseDescription = "";

      for (const section of sections) {
        const title = section.title.toLowerCase();

        // Look for learning outcomes or objectives section
        if (
          title.includes("learning outcome") ||
          title.includes("learning objective") ||
          title.includes("objective") ||
          title.includes("outcome")
        ) {
          // Extract learning outcomes (often in bullet points or numbered lists)
          const outcomeMatches =
            section.content.match(
              /(?:\n[-•*]|\n\d+[\.)]\s*|\n[a-z][\.)]\s*)([^\n]+)/g
            ) || [];

          for (const match of outcomeMatches) {
            const cleanOutcome = match
              .replace(/^\n[-•*]|\n\d+[\.)]\s*|\n[a-z][\.)]\s*/, "")
              .trim();

            // Try to determine the Bloom's taxonomy level
            let bloomsLevel = "understand"; // Default level

            const bloomsKeywords = {
              remember: [
                "recall",
                "define",
                "list",
                "name",
                "identify",
                "state",
                "select",
                "match",
                "recognize",
              ],
              understand: [
                "describe",
                "explain",
                "interpret",
                "summarize",
                "classify",
                "compare",
                "discuss",
                "paraphrase",
              ],
              apply: [
                "apply",
                "use",
                "demonstrate",
                "implement",
                "execute",
                "solve",
                "compute",
                "show",
                "practice",
              ],
              analyze: [
                "analyze",
                "differentiate",
                "examine",
                "compare",
                "contrast",
                "distinguish",
                "investigate",
                "categorize",
              ],
              evaluate: [
                "evaluate",
                "assess",
                "judge",
                "criticize",
                "appraise",
                "recommend",
                "justify",
                "defend",
                "critique",
              ],
              create: [
                "create",
                "design",
                "develop",
                "formulate",
                "construct",
                "plan",
                "produce",
                "devise",
                "invent",
              ],
            };

            // Find the Bloom's level by checking for keywords
            for (const [level, keywords] of Object.entries(bloomsKeywords)) {
              for (const keyword of keywords) {
                if (
                  cleanOutcome.toLowerCase().startsWith(keyword) ||
                  cleanOutcome.toLowerCase().includes(` ${keyword} `)
                ) {
                  bloomsLevel = level;
                  break;
                }
              }
            }

            learningOutcomes.push({
              description: cleanOutcome,
              bloomsTaxonomyLevel: bloomsLevel,
            });
          }
        }

        // Look for course description
        if (
          title.includes("description") ||
          title.includes("introduction") ||
          title.includes("overview")
        ) {
          courseDescription = section.content.trim();
        }
      }

      return {
        learningOutcomes,
        courseDescription,
      };
    } catch (error) {
      logger.error("Error extracting lecture outlines and outcomes:", error);
      throw new Error("Failed to extract lecture outlines and outcomes");
    }
  }
  /**
   * Extract text from a PDF buffer
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<string>} - Extracted text
   */
  async extractTextFromBuffer(pdfBuffer) {
    try {
      const data = await pdfParse(pdfBuffer);
      return data.text;
    } catch (error) {
      logger.error("Error extracting text from PDF buffer:", error);
      throw new Error("Failed to extract text from PDF");
    }
  }

  /**
   * Extract text from a PDF file
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<string>} - Extracted text
   */
  async extractTextFromFile(filePath) {
    try {
      const pdfBuffer = fs.readFileSync(filePath);
      return this.extractTextFromBuffer(pdfBuffer);
    } catch (error) {
      logger.error(`Error extracting text from PDF file ${filePath}:`, error);
      throw new Error("Failed to extract text from PDF file");
    }
  }

  /**
   * Upload PDF to Azure Blob Storage
   * @param {Buffer} fileBuffer - PDF file buffer
   * @param {string} fileName - Name to save the file as
   * @returns {Promise<string>} - URL of the uploaded file
   */
  async uploadToStorage(fileBuffer, fileName) {
    try {
      // Create a unique name for the blob
      const blobName = `${Date.now()}-${fileName}`;

      // Get a block blob client
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      // Upload data to the blob
      await blockBlobClient.upload(fileBuffer, fileBuffer.length);

      // Return the URL
      return blockBlobClient.url;
    } catch (error) {
      logger.error(`Error uploading PDF to Azure Blob Storage:`, error);
      throw new Error("Failed to upload PDF to storage");
    }
  }

  /**
   * Download PDF from Azure Blob Storage
   * @param {string} blobUrl - URL of the blob to download
   * @returns {Promise<Buffer>} - Downloaded file as buffer
   */
  async downloadFromStorage(blobUrl) {
    try {
      // Extract the blob name from the URL
      const blobName = path.basename(blobUrl);

      // Get a block blob client
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      // Download the blob content
      const downloadBlockBlobResponse = await blockBlobClient.download(0);

      // Convert stream to buffer
      const chunks = [];
      const stream = downloadBlockBlobResponse.readableStreamBody;

      return new Promise((resolve, reject) => {
        stream.on("data", (data) => {
          chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        stream.on("end", () => {
          resolve(Buffer.concat(chunks));
        });
        stream.on("error", reject);
      });
    } catch (error) {
      logger.error(`Error downloading PDF from Azure Blob Storage:`, error);
      throw new Error("Failed to download PDF from storage");
    }
  }
}
module.exports = new PdfExtractorService();
