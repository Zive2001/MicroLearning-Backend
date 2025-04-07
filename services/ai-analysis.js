// services/ai-analysis.js
const natural = require('natural');
const { OpenAI } = require('openai');
const tokenizer = new natural.WordTokenizer();
require('dotenv').config();

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Extract key concepts from lab sheet text
 * @param {string} text - Lab sheet text content
 * @returns {Promise<Array<string>>} - Extracted key concepts
 */
const extractKeyConcepts = async (text) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a database education expert specialized in extracting key concepts and technical terms from database course materials."
        },
        {
          role: "user",
          content: `Extract the key database concepts from the following lab sheet content. Return ONLY a JSON array of strings with the concept names:\n\n${text.substring(0, 8000)}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const concepts = JSON.parse(response.choices[0].message.content).concepts;
    return concepts;
  } catch (error) {
    console.error('Error extracting key concepts:', error);
    // Fallback to basic keyword extraction if OpenAI fails
    return extractKeywordsBasic(text);
  }
};

/**
 * Basic keyword extraction fallback
 * @param {string} text - Text to extract keywords from
 * @returns {Array<string>} - Extracted keywords
 */
const extractKeywordsBasic = (text) => {
  const tokens = tokenizer.tokenize(text.toLowerCase());
  const dbKeywords = [
    'sql', 'database', 'query', 'table', 'join', 'select', 'from', 'where',
    'object', 'relational', 'stock', 'client', 'method', 'yield', 'dividend',
    'price', 'exchange', 'purchase', 'profit', 'value', 'ref', 'type'
  ];
  
  return [...new Set(tokens.filter(token => 
    dbKeywords.includes(token) || 
    dbKeywords.some(keyword => token.includes(keyword))
  ))];
};

/**
 * Chunk the lab sheet content into learning goals
 * @param {object} labSheet - The lab sheet data
 * @returns {Promise<Array<object>>} - Learning goal chunks
 */
const chunkIntoLearningGoals = async (labSheet) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a database education expert specialized in breaking down complex learning materials into manageable learning goals."
        },
        {
          role: "user",
          content: `Break down the following lab sheet content into 4-6 logical learning goals. 
          Each learning goal should represent a discrete skill or concept to master.
          For each goal, identify: 
          1. A title
          2. The key concepts involved
          3. The specific exercises/questions that relate to this goal
          4. Prerequisites (if any)
          
          Return your response as a JSON array of learning goal objects with these fields.
          
          Lab sheet content:
          ${labSheet.originalText.substring(0, 8000)}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const learningGoals = JSON.parse(response.choices[0].message.content).learningGoals;
    return learningGoals;
  } catch (error) {
    console.error('Error chunking into learning goals:', error);
    // Fallback to basic chunking based on exercises
    return labSheet.exercises.map((exercise, index) => ({
      id: `goal-${index + 1}`,
      title: `Goal ${index + 1}: ${exercise.description.substring(0, 50)}...`,
      keyConcepts: [],
      exercises: [exercise.number],
      prerequisites: []
    }));
  }
};

/**
 * Generate learning path for each learning goal
 * @param {object} learningGoal - The learning goal
 * @param {object} labSheet - The lab sheet data
 * @returns {Promise<object>} - Complete learning path
 */
const generateLearningPath = async (learningGoal, labSheet) => {
  try {
    const prompt = `
    Create a comprehensive microlearning path for the following database learning goal:
    
    Goal Title: ${learningGoal.title}
    Key Concepts: ${learningGoal.keyConcepts.join(", ")}
    Related Exercises: ${learningGoal.exercises.join(", ")}
    
    For this learning goal, generate:
    
    1. CONCEPT: A brief theoretical explanation (max 200 words)
    2. EXAMPLE: A practical code example demonstrating the concepts
    3. PRACTICE: An interactive SQL exercise for students to try
    4. CHALLENGE: A more difficult task that tests mastery of the concept
    
    Structure your response as a JSON object with these four sections.
    
    Lab sheet context:
    ${labSheet.originalText.substring(0, 4000)}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a database education expert specialized in creating engaging microlearning content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const learningPath = JSON.parse(response.choices[0].message.content);
    return {
      ...learningGoal,
      learningPath
    };
  } catch (error) {
    console.error('Error generating learning path:', error);
    return {
      ...learningGoal,
      learningPath: {
        concept: "Error generating concept. Please try again later.",
        example: "Error generating example. Please try again later.",
        practice: "Error generating practice. Please try again later.",
        challenge: "Error generating challenge. Please try again later."
      }
    };
  }
};

module.exports = {
  extractKeyConcepts,
  chunkIntoLearningGoals,
  generateLearningPath
};