const { logger } = require("../utils/logger");
const llmService = require("./llmService");
const embeddingService = require("./embeddingService");

/**
 * Service to handle formatting content according to CLT-bLM principles
 */
class CLTFormatterService {
  constructor() {
    // Define Bloom's Taxonomy levels and their corresponding verbs
    this.bloomsTaxonomyVerbs = {
      remember: [
        "define",
        "describe",
        "identify",
        "know",
        "label",
        "list",
        "match",
        "name",
        "outline",
        "recall",
        "recognize",
        "select",
        "state",
      ],
      understand: [
        "comprehend",
        "convert",
        "defend",
        "distinguish",
        "estimate",
        "explain",
        "extend",
        "generalize",
        "give examples",
        "infer",
        "interpret",
        "paraphrase",
        "predict",
        "rewrite",
        "summarize",
        "translate",
      ],
      apply: [
        "apply",
        "change",
        "compute",
        "construct",
        "demonstrate",
        "discover",
        "manipulate",
        "modify",
        "operate",
        "predict",
        "prepare",
        "produce",
        "relate",
        "show",
        "solve",
        "use",
      ],
      analyze: [
        "analyze",
        "break down",
        "compare",
        "contrast",
        "diagram",
        "deconstruct",
        "differentiate",
        "discriminate",
        "distinguish",
        "identify",
        "illustrate",
        "infer",
        "outline",
        "relate",
        "select",
        "separate",
      ],
      evaluate: [
        "appraise",
        "argue",
        "assess",
        "compare",
        "conclude",
        "contrast",
        "criticize",
        "critique",
        "defend",
        "describe",
        "discriminate",
        "evaluate",
        "explain",
        "interpret",
        "justify",
        "relate",
        "summarize",
        "support",
      ],
      create: [
        "categorize",
        "combine",
        "compile",
        "compose",
        "create",
        "design",
        "devise",
        "establish",
        "formulate",
        "generate",
        "invent",
        "make",
        "originate",
        "plan",
        "produce",
        "propose",
        "rearrange",
      ],
    };

    // CLT-bLM phase structures
    this.cltPhases = ["prepare", "initiate", "deliver", "end"];
  }

  /**
   * Determine the Bloom's Taxonomy level for a learning outcome
   * @param {string} outcome - Learning outcome text
   * @returns {Promise<string>} - Identified Bloom's Taxonomy level
   */
  async identifyBloomsTaxonomyLevel(outcome) {
    try {
      const lowerOutcome = outcome.toLowerCase();

      // Check if the outcome starts with any of the Bloom's Taxonomy verbs
      for (const [level, verbs] of Object.entries(this.bloomsTaxonomyVerbs)) {
        for (const verb of verbs) {
          if (
            lowerOutcome.startsWith(verb + " ") ||
            lowerOutcome.includes(" " + verb + " ")
          ) {
            return level;
          }
        }
      }

      // If no verb is found, use embeddings to find the closest matching level
      const levelDescriptions = {
        remember: "Recall facts and basic concepts",
        understand: "Explain ideas or concepts",
        apply: "Use information in new situations",
        analyze: "Draw connections among ideas",
        evaluate: "Justify a stand or decision",
        create: "Produce new or original work",
      };

      const levels = Object.keys(levelDescriptions);
      const descriptions = Object.values(levelDescriptions);

      const similarLevels = await embeddingService.findMostSimilarTexts(
        outcome,
        descriptions,
        1
      );

      if (similarLevels.length > 0) {
        const mostSimilarIndex = descriptions.indexOf(similarLevels[0].text);
        return levels[mostSimilarIndex];
      }

      // Default to "understand" if no match is found
      return "understand";
    } catch (error) {
      logger.error("Error identifying Bloom's Taxonomy level:", error);
      return "understand"; // Default fallback
    }
  }

  /**
   * Organize content into CLT-bLM phases
   * @param {string} title - Lecture title
   * @param {Array<Object>} learningOutcomes - Learning outcomes with Bloom's levels
   * @param {string} referenceContent - Reference content
   * @returns {Promise<Object>} - Organized content for each CLT-bLM phase
   */
  async organizeContentIntoCLTPhases(
    title,
    learningOutcomes,
    referenceContent
  ) {
    try {
      // Determine the highest Bloom's Taxonomy level in the learning outcomes
      let highestLevel = "remember";
      const bloomsHierarchy = [
        "remember",
        "understand",
        "apply",
        "analyze",
        "evaluate",
        "create",
      ];

      for (const outcome of learningOutcomes) {
        const level =
          outcome.bloomsTaxonomyLevel ||
          (await this.identifyBloomsTaxonomyLevel(outcome.description));

        // Update outcome with identified level if not already set
        if (!outcome.bloomsTaxonomyLevel) {
          outcome.bloomsTaxonomyLevel = level;
        }

        // Update highest level if this one is higher
        const currentLevelIndex = bloomsHierarchy.indexOf(level);
        const highestLevelIndex = bloomsHierarchy.indexOf(highestLevel);

        if (currentLevelIndex > highestLevelIndex) {
          highestLevel = level;
        }
      }

      // Generate content for each CLT-bLM phase
      const phaseContent = {};

      for (const phase of this.cltPhases) {
        phaseContent[phase] = await llmService.generateLectureContent({
          title,
          learningOutcomes,
          referenceContent,
          cltPhase: phase,
          bloomsLevel: highestLevel,
        });
      }

      return phaseContent;
    } catch (error) {
      logger.error("Error organizing content into CLT-bLM phases:", error);
      throw new Error("Failed to organize content into CLT-bLM phases");
    }
  }

  /**
   * Generate avatar scripts for each CLT-bLM phase
   * @param {Object} phaseContent - Content organized by CLT-bLM phase
   * @returns {Promise<Object>} - Avatar scripts for each phase
   */
  async generateAvatarScripts(phaseContent) {
    try {
      const avatarScripts = {};

      for (const phase of this.cltPhases) {
        if (phaseContent[phase]) {
          avatarScripts[phase] = await llmService.generateAvatarScript(
            phaseContent[phase],
            phase
          );
        }
      }

      return avatarScripts;
    } catch (error) {
      logger.error("Error generating avatar scripts:", error);
      throw new Error("Failed to generate avatar scripts");
    }
  }

  /**
   * Split content into microlearning chunks
   * @param {Object} phaseContent - Content organized by CLT-bLM phase
   * @returns {Promise<Array<Object>>} - Array of microlearning chunks
   */
  async splitIntoMicrolearningChunks(phaseContent) {
    try {
      const microlearningChunks = [];

      // For each CLT-bLM phase
      for (const phase of this.cltPhases) {
        if (!phaseContent[phase]) continue;

        // Split the phase content by paragraphs
        const paragraphs = phaseContent[phase].split(/\n\s*\n/);

        // Group paragraphs into chunks of roughly equal size for microlearning
        const idealChunkSize = 3; // Number of paragraphs per chunk

        for (let i = 0; i < paragraphs.length; i += idealChunkSize) {
          const chunkParagraphs = paragraphs.slice(i, i + idealChunkSize);
          const chunkContent = chunkParagraphs.join("\n\n");

          // Only add non-empty chunks
          if (chunkContent.trim().length > 0) {
            microlearningChunks.push({
              phase,
              content: chunkContent,
              order: microlearningChunks.length + 1,
            });
          }
        }
      }

      return microlearningChunks;
    } catch (error) {
      logger.error("Error splitting content into microlearning chunks:", error);
      throw new Error("Failed to split content into microlearning chunks");
    }
  }

  /**
   * Generate learning materials for a lecture
   * @param {string} title - Lecture title
   * @param {Array<Object>} learningOutcomes - Learning outcomes
   * @param {string} referenceContent - Reference content
   * @returns {Promise<Object>} - Complete learning materials
   */
  async generateLearningMaterials(title, learningOutcomes, referenceContent) {
    try {
      // Organize content into CLT-bLM phases
      const phaseContent = await this.organizeContentIntoCLTPhases(
        title,
        learningOutcomes,
        referenceContent
      );

      // Generate avatar scripts
      const avatarScripts = await this.generateAvatarScripts(phaseContent);

      // Split into microlearning chunks
      const microlearningChunks = await this.splitIntoMicrolearningChunks(
        phaseContent
      );

      // Generate quiz questions based on the content
      const quizQuestions = await llmService.generateQuizQuestions(
        Object.values(phaseContent).join("\n\n"),
        learningOutcomes[0].bloomsTaxonomyLevel, // Use the first outcome's level as an example
        5 // Number of questions
      );

      // Return the complete learning materials
      return {
        title,
        learningOutcomes,
        phaseContent,
        avatarScripts,
        microlearningChunks,
        quizQuestions,
      };
    } catch (error) {
      logger.error("Error generating learning materials:", error);
      throw new Error("Failed to generate learning materials");
    }
  }
}

module.exports = new CLTFormatterService();
