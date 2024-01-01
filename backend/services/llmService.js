const { OpenAI } = require("langchain/llms/openai");
const { ChatOpenAI } = require("langchain/chat_models/openai");
const { PromptTemplate } = require("langchain/prompts");
const { StringOutputParser } = require("langchain/schema/output_parser");
const { logger } = require("../utils/logger");
const config = require("../config/env");

/**
 * Service to handle LLM (Large Language Model) operations
 */
class LLMService {
  constructor() {
    // Initialize text model for content generation
    this.textModel = new OpenAI({
      azureOpenAIApiKey: config.AZURE_OPENAI_API_KEY,
      azureOpenAIApiVersion: config.AZURE_OPENAI_API_VERSION,
      azureOpenAIApiInstanceName: config.AZURE_OPENAI_ENDPOINT.replace(
        "https://",
        ""
      ).replace(".openai.azure.com/", ""),
      azureOpenAIApiDeploymentName: config.AZURE_OPENAI_DEPLOYMENT_NAME,
      temperature: 0.2,
      maxTokens: 2000,
      maxRetries: 3,
    });

    // Initialize chat model for more interactive content
    this.chatModel = new ChatOpenAI({
      azureOpenAIApiKey: config.AZURE_OPENAI_API_KEY,
      azureOpenAIApiVersion: config.AZURE_OPENAI_API_VERSION,
      azureOpenAIApiInstanceName: config.AZURE_OPENAI_ENDPOINT.replace(
        "https://",
        ""
      ).replace(".openai.azure.com/", ""),
      azureOpenAIApiDeploymentName: config.AZURE_OPENAI_DEPLOYMENT_NAME,
      temperature: 0.3,
      maxTokens: 2000,
      maxRetries: 3,
    });

    // Output parser
    this.outputParser = new StringOutputParser();
  }

  /**
   * Generate lecture content using the CLT-bLM format
   * @param {Object} params - Parameters for content generation
   * @param {string} params.title - Lecture title
   * @param {Array<Object>} params.learningOutcomes - Learning outcomes
   * @param {string} params.referenceContent - Reference content
   * @param {string} params.cltPhase - CLT-bLM phase (prepare, initiate, deliver, end)
   * @param {string} params.bloomsLevel - Bloom's Taxonomy level
   * @returns {Promise<string>} - Generated lecture content
   */
  async generateLectureContent(params) {
    try {
      const {
        title,
        learningOutcomes,
        referenceContent,
        cltPhase,
        bloomsLevel,
      } = params;

      // Convert learning outcomes to string format
      const formattedOutcomes = learningOutcomes
        .map(
          (outcome) =>
            `- ${outcome.description} (${outcome.bloomsTaxonomyLevel})`
        )
        .join("\n");

      // Create prompt template based on CLT phase
      let promptTemplate;

      switch (cltPhase.toLowerCase()) {
        case "prepare":
          promptTemplate = PromptTemplate.fromTemplate(`
            You are an expert educational content creator specializing in the CLT-based Lecture Model.
            Generate the PREPARE phase content for a lecture titled "${title}".
            
            The Prepare phase should:
            1. Provide a clear structure for the lecture
            2. Apply techniques for effective slide preparation
            3. Use information chunking to reduce cognitive load
            4. Avoid extraneous words, pictures, and animations
            5. Manage diagrams effectively
            
            Learning Outcomes:
            ${formattedOutcomes}
            
            Reference Content:
            ${referenceContent}
            
            Aim for content at the Bloom's Taxonomy level: ${bloomsLevel}.
            
            Generate a structured, clear, and concise PREPARE phase content:
          `);
          break;

        case "initiate":
          promptTemplate = PromptTemplate.fromTemplate(`
            You are an expert educational content creator specializing in the CLT-based Lecture Model.
            Generate the INITIATE phase content for a lecture titled "${title}".
            
            The Initiate phase should:
            1. Conduct a pre-lecture activity to activate prior knowledge
            2. Explain the purpose of the lecture
            3. Encourage focused attention
            4. Use forethought to prepare students mentally
            5. Provide reassurance for complex topics
            6. Verbally highlight learning outcomes and lecture outline
            
            Learning Outcomes:
            ${formattedOutcomes}
            
            Reference Content:
            ${referenceContent}
            
            Aim for content at the Bloom's Taxonomy level: ${bloomsLevel}.
            
            Generate an engaging and motivating INITIATE phase content:
          `);
          break;

        case "deliver":
          promptTemplate = PromptTemplate.fromTemplate(`
            You are an expert educational content creator specializing in the CLT-based Lecture Model.
            Generate the DELIVER phase content for a lecture titled "${title}".
            
            The Deliver phase should:
            1. Conduct intra-lecture activity to maintain engagement
            2. Revisit previous knowledge to build connections
            3. Use dual modes of presentation (visual and verbal)
            4. Provide examples and analogies to enhance understanding
            5. Pause and ask questions to check comprehension
            6. Consider pace and intonation for clarity
            7. Avoid distracting verbal and non-verbal elements
            
            Learning Outcomes:
            ${formattedOutcomes}
            
            Reference Content:
            ${referenceContent}
            
            Aim for content at the Bloom's Taxonomy level: ${bloomsLevel}.
            
            Generate a clear, structured, and engaging DELIVER phase content:
          `);
          break;

        case "end":
          promptTemplate = PromptTemplate.fromTemplate(`
            You are an expert educational content creator specializing in the CLT-based Lecture Model.
            Generate the END phase content for a lecture titled "${title}".
            
            The End phase should:
            1. Provide a summary of the key points from the lecture
            2. Pose questions to trigger self-explanation
            3. Include a short-answer quiz to reinforce learning
            4. Disclose expectations for future learning
            5. Provide references for further study
            6. Offer consultation opportunities
            7. Seek feedback on the lecture
            
            Learning Outcomes:
            ${formattedOutcomes}
            
            Reference Content:
            ${referenceContent}
            
            Aim for content at the Bloom's Taxonomy level: ${bloomsLevel}.
            
            Generate a conclusive and reinforcing END phase content:
          `);
          break;

        default:
          throw new Error(`Invalid CLT phase: ${cltPhase}`);
      }

      // Create the chain
      const chain = promptTemplate.pipe(this.textModel).pipe(this.outputParser);

      // Execute the chain
      const result = await chain.invoke({});

      return result;
    } catch (error) {
      logger.error("Error generating lecture content:", error);
      throw new Error("Failed to generate lecture content");
    }
  }

  /**
   * Generate a 3D avatar script for lecture delivery
   * @param {string} lectureContent - The lecture content
   * @param {string} cltPhase - CLT-bLM phase
   * @returns {Promise<string>} - Generated script for the avatar
   */
  async generateAvatarScript(lectureContent, cltPhase) {
    try {
      const promptTemplate = PromptTemplate.fromTemplate(`
        You are an expert in converting lecture content into engaging scripts for a 3D virtual avatar.
        
        Convert the following ${cltPhase.toUpperCase()} phase lecture content into a script that a virtual teacher avatar can use.
        
        The script should:
        1. Be conversational and engaging
        2. Include appropriate pauses, emphasis, and intonation cues
        3. Add gestures or expressions where appropriate (in parentheses)
        4. Break down complex content into digestible segments
        5. Include rhetorical questions to engage the audience
        6. Follow best practices for the ${cltPhase} phase of the CLT-based Lecture Model
        7. Be optimized for a 6-9 minute delivery
        
        Lecture Content:
        ${lectureContent}
        
        Format the script with clear speaker cues and instructions for the avatar:
      `);

      // Create the chain
      const chain = promptTemplate.pipe(this.chatModel).pipe(this.outputParser);

      // Execute the chain
      const result = await chain.invoke({});

      return result;
    } catch (error) {
      logger.error("Error generating avatar script:", error);
      throw new Error("Failed to generate avatar script");
    }
  }

  /**
   * Generate quiz questions based on lecture content
   * @param {string} lectureContent - The lecture content
   * @param {string} bloomsLevel - Bloom's Taxonomy level
   * @param {number} numQuestions - Number of questions to generate
   * @returns {Promise<Array<Object>>} - Generated quiz questions with answers
   */
  async generateQuizQuestions(lectureContent, bloomsLevel, numQuestions = 3) {
    try {
      const promptTemplate = PromptTemplate.fromTemplate(`
        You are an expert educator with experience in assessment design.
        
        Generate ${numQuestions} quiz questions based on the following lecture content.
        The questions should align with the ${bloomsLevel} level of Bloom's Taxonomy.
        
        For each question, provide:
        1. The question text
        2. 4 multiple-choice options (A, B, C, D)
        3. The correct answer (letter)
        4. A brief explanation of why the answer is correct
        
        Lecture Content:
        ${lectureContent}
        
        Return the questions in JSON format like this:
        [
          {
            "question": "Question text here?",
            "options": {
              "A": "Option A",
              "B": "Option B", 
              "C": "Option C",
              "D": "Option D"
            },
            "correctAnswer": "B",
            "explanation": "Explanation here"
          }
        ]
      `);

      // Create the chain
      const chain = promptTemplate.pipe(this.chatModel).pipe(this.outputParser);

      // Execute the chain
      const result = await chain.invoke({});

      // Parse the JSON result
      return JSON.parse(result);
    } catch (error) {
      logger.error("Error generating quiz questions:", error);
      throw new Error("Failed to generate quiz questions");
    }
  }

  /**
   * Summarize lecture content
   * @param {string} lectureContent - The lecture content to summarize
   * @param {number} maxLength - Maximum length of the summary in characters
   * @returns {Promise<string>} - Summarized lecture content
   */
  async summarizeLectureContent(lectureContent, maxLength = 500) {
    try {
      const promptTemplate = PromptTemplate.fromTemplate(`
        Summarize the following lecture content in a concise way.
        Focus on the key points and main ideas while maintaining clarity.
        Keep the summary under ${maxLength} characters.
        
        Lecture Content:
        ${lectureContent}
        
        Summary:
      `);

      // Create the chain
      const chain = promptTemplate.pipe(this.textModel).pipe(this.outputParser);

      // Execute the chain
      const result = await chain.invoke({});

      return result;
    } catch (error) {
      logger.error("Error summarizing lecture content:", error);
      throw new Error("Failed to summarize lecture content");
    }
  }

  /**
   * Generate feedback on student answers
   * @param {string} question - The question that was asked
   * @param {string} correctAnswer - The correct answer
   * @param {string} studentAnswer - The answer provided by the student
   * @returns {Promise<Object>} - Feedback object with assessment and suggestions
   */
  async generateFeedback(question, correctAnswer, studentAnswer) {
    try {
      const promptTemplate = PromptTemplate.fromTemplate(`
        You are an AI teacher assistant providing feedback on student answers.
        
        Question: ${question}
        Correct Answer: ${correctAnswer}
        Student's Answer: ${studentAnswer}
        
        Provide feedback on the student's answer, including:
        1. Whether the answer is correct, partially correct, or incorrect
        2. What aspects of the answer are good
        3. What aspects need improvement
        4. Suggestions for how to improve the answer
        5. A numerical score from 0-100
        
        Return the feedback in JSON format like this:
        {
          "assessment": "correct/partially correct/incorrect",
          "score": 85,
          "positiveAspects": "What was good about the answer",
          "improvementAreas": "What needs improvement",
          "suggestions": "Specific suggestions for improvement",
          "explanation": "Explanation of the correct answer"
        }
      `);

      // Create the chain
      const chain = promptTemplate.pipe(this.chatModel).pipe(this.outputParser);

      // Execute the chain
      const result = await chain.invoke({});

      // Parse the JSON result
      return JSON.parse(result);
    } catch (error) {
      logger.error("Error generating feedback:", error);
      throw new Error("Failed to generate feedback");
    }
  }
}

module.exports = new LLMService();
