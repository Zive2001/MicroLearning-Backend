// controllers/sqlPlaygroundController.js
const { executeQuery, validateQuery, resetEnvironment } = require('../services/sql-execution');
const LearningGoal = require('../models/LearningGoal');
const { generateSetupScripts } = require('../services/schema-generation');

/**
 * Execute a SQL query for a specific learning goal
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const executeUserQuery = async (req, res) => {
  try {
    const { query, goalId } = req.body;
    const userId = req.userId || 'anonymous'; // Would come from auth middleware
    const sessionId = `${userId}_${Date.now()}`;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'No query provided'
      });
    }
    
    // Execute the query
    const result = await executeQuery(query, [], sessionId);
    
    // Record the attempt if goalId is provided
    if (goalId) {
      // TODO: Store the attempt in a QueryAttempt model
      console.log(`Query attempt for goal ${goalId} by ${userId}`);
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({
      success: false,
      message: 'Error executing query',
      error: error.message
    });
  }
};

/**
 * Validate a SQL query
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const validateUserQuery = async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        valid: false,
        message: 'No query provided'
      });
    }
    
    const result = await validateQuery(query);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error validating query:', error);
    res.status(500).json({
      valid: false,
      message: 'Error validating query',
      error: error.message
    });
  }
};

/**
 * Setup the playground environment for a specific learning goal
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const setupEnvironment = async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.userId || 'anonymous'; // Would come from auth middleware
    const sessionId = `${userId}_${Date.now()}`;
    
    // Get the learning goal details
    const goal = await LearningGoal.findById(goalId);
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Learning goal not found'
      });
    }
    
    // Generate setup scripts based on the learning goal
    const setupScripts = await generateSetupScripts(goal);
    
    // Reset the environment with the setup scripts
    const result = await resetEnvironment(sessionId, setupScripts);
    
    res.status(200).json({
      ...result,
      sessionId,
      goal: {
        id: goal._id,
        title: goal.title,
        practice: goal.learningPath.practice,
        challenge: goal.learningPath.challenge
      }
    });
  } catch (error) {
    console.error('Error setting up environment:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up environment',
      error: error.message
    });
  }
};

/**
 * Evaluate a solution against expected results
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const evaluateSolution = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { query, isChallenge } = req.body;
    const userId = req.userId || 'anonymous'; // Would come from auth middleware
    
    // Get the learning goal details
    const goal = await LearningGoal.findById(goalId);
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Learning goal not found'
      });
    }
    
    // Execute the user's query
    const result = await executeQuery(query);
    
    // TODO: Compare with expected results
    // This would require a validation service
    const evaluation = {
      correct: true, // Placeholder
      feedback: 'Your solution looks correct!', // Placeholder
      points: isChallenge ? 10 : 5, // More points for challenge
      executionResult: result
    };
    
    // TODO: Update user progress
    
    res.status(200).json(evaluation);
  } catch (error) {
    console.error('Error evaluating solution:', error);
    res.status(500).json({
      success: false,
      message: 'Error evaluating solution',
      error: error.message
    });
  }
};

/**
 * Setup test environment with hardcoded script
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const setupTestEnvironment = async (req, res) => {
  try {
    const userId = req.userId || 'anonymous';
    const sessionId = `${userId}_${Date.now()}`;
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 20);
    
    // Simple Oracle script that should definitely work
    const setupScript = `
CREATE TABLE ${safeSessionId}_employees (
  empno VARCHAR2(6) PRIMARY KEY,
  firstname VARCHAR2(12),
  lastname VARCHAR2(15),
  salary NUMBER(8,2)
);

INSERT INTO ${safeSessionId}_employees VALUES ('000010', 'CHRISTINE', 'HAAS', 72750);
INSERT INTO ${safeSessionId}_employees VALUES ('000020', 'MICHAEL', 'THOMPSON', 61250);
    `;
    
    // Execute using the raw query function
    const result = await executeQuery(setupScript);
    
    res.status(200).json({
      success: result.success,
      message: result.success ? 'Test environment setup successful' : 'Test environment setup failed',
      result,
      sessionId: safeSessionId
    });
  } catch (error) {
    console.error('Error setting up test environment:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up test environment',
      error: error.message
    });
  }
};

module.exports = {
  executeUserQuery,
  validateUserQuery,
  setupEnvironment,
  evaluateSolution,
  setupTestEnvironment
};