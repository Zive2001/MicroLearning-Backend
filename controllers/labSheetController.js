// controllers/labSheetController.js
const fs = require('fs');
const path = require('path');
const { extractPdfContent, processLabSheet } = require('../services/pdf-extraction');
const { generateMissionsFromLearningGoals } = require('../services/mission-generator');

const { 
  extractKeyConcepts, 
  chunkIntoLearningGoals, 
  generateLearningPath 
} = require('../services/ai-analysis');
const LabSheet = require('../models/LabSheet');
const LearningGoal = require('../models/LearningGoal');
/**
 * Upload and process a lab sheet
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const uploadLabSheet = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    
    // Extract content from the PDF
    const pdfData = await extractPdfContent(filePath);
    
    // Process the lab sheet content
    const processedData = processLabSheet(pdfData);
    
    // Map the exercises to the schema format
    const exercises = processedData.exercises.map((ex, index) => {
      const match = ex.match(/(\d+)\.(.+)/);
      
      if (match) {
        const number = match[1];
        const description = match[2].trim();
        
        // Try to extract sub-exercises
        const subExMatches = description.match(/\([a-z]\)([^(]+)/g);
        const subExercises = [];
        
        if (subExMatches) {
          subExMatches.forEach(subEx => {
            const subMatch = subEx.match(/\(([a-z])\)(.+)/);
            if (subMatch) {
              subExercises.push({
                letter: subMatch[1],
                description: subMatch[2].trim()
              });
            }
          });
        }
        
        return {
          number,
          description,
          subExercises
        };
      }
      
      return {
        number: String(index + 1),
        description: ex,
        subExercises: []
      };
    });
    
    // Create a new lab sheet in the database
    const labSheet = new LabSheet({
      labNumber: processedData.labSheetNumber,
      title: processedData.title,
      exercises,
      originalText: processedData.rawText,
      filePath: filePath
    });
    
    // Save to the database
    await labSheet.save();
    
    res.status(201).json({
      message: 'Lab sheet uploaded and processed successfully',
      labSheet: {
        id: labSheet._id,
        labNumber: labSheet.labNumber,
        title: labSheet.title,
        exercises: labSheet.exercises
      }
    });
  } catch (error) {
    console.error('Error processing lab sheet:', error);
    res.status(500).json({ message: 'Failed to process lab sheet', error: error.message });
  }
};

/**
 * Get all lab sheets
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getAllLabSheets = async (req, res) => {
  try {
    const labSheets = await LabSheet.find({}, '-originalText');
    res.status(200).json(labSheets);
  } catch (error) {
    console.error('Error retrieving lab sheets:', error);
    res.status(500).json({ message: 'Failed to retrieve lab sheets', error: error.message });
  }
};

/**
 * Get a single lab sheet by ID
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getLabSheetById = async (req, res) => {
  try {
    const labSheet = await LabSheet.findById(req.params.id);
    
    if (!labSheet) {
      return res.status(404).json({ message: 'Lab sheet not found' });
    }
    
    res.status(200).json(labSheet);
  } catch (error) {
    console.error('Error retrieving lab sheet:', error);
    res.status(500).json({ message: 'Failed to retrieve lab sheet', error: error.message });
  }
};

/**
 * Analyze a lab sheet and generate learning content
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const analyzeLabSheet = async (req, res) => {
    try {
      const labSheetId = req.params.id;
      const labSheet = await LabSheet.findById(labSheetId);
      
      if (!labSheet) {
        return res.status(404).json({ message: 'Lab sheet not found' });
      }
      
      // Extract key concepts
      const concepts = await extractKeyConcepts(labSheet.originalText);
      
      // Store key concepts in the lab sheet
      labSheet.concepts = concepts;
      await labSheet.save();
      
      // Delete any existing learning goals for this lab sheet to avoid duplication
      await LearningGoal.deleteMany({ labSheetId: labSheet._id });
      
      // Chunk into learning goals
      const learningGoals = await chunkIntoLearningGoals(labSheet);
      
      // Store and generate learning paths for each goal
      const createdGoals = [];
      
      for (let i = 0; i < learningGoals.length; i++) {
        const goal = learningGoals[i];
        
        // Generate detailed learning path
        const fullGoal = await generateLearningPath(goal, labSheet);
        
        // Save to database
        const learningGoal = new LearningGoal({
          labSheetId: labSheet._id,
          title: fullGoal.title,
          keyConcepts: fullGoal.keyConcepts || [],
          exercises: fullGoal.exercises || [],
          prerequisites: fullGoal.prerequisites || [],
          learningPath: fullGoal.learningPath,
          order: i
        });
        
        await learningGoal.save();
        createdGoals.push(learningGoal);

        await generateMissionsFromLearningGoals(labSheet._id);
      }
      
      res.status(200).json({
        message: 'Lab sheet analyzed successfully',
        concepts,
        learningGoals: createdGoals.map(goal => ({
          id: goal._id,
          title: goal.title,
          keyConcepts: goal.keyConcepts
        }))
      });
    } catch (error) {
      console.error('Error analyzing lab sheet:', error);
      res.status(500).json({ 
        message: 'Failed to analyze lab sheet', 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };
  
  /**
   * Get learning goals for a lab sheet
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  const getLabSheetLearningGoals = async (req, res) => {
    try {
      const labSheetId = req.params.id;
      const goals = await LearningGoal.find({ labSheetId }).sort('order');
      
      if (!goals || goals.length === 0) {
        return res.status(404).json({ message: 'No learning goals found for this lab sheet' });
      }
      
      res.status(200).json(goals);
    } catch (error) {
      console.error('Error retrieving learning goals:', error);
      res.status(500).json({ message: 'Failed to retrieve learning goals', error: error.message });
    }
  };
  
  /**
   * Get a specific learning goal
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  const getLearningGoal = async (req, res) => {
    try {
      const goalId = req.params.goalId;
      const goal = await LearningGoal.findById(goalId);
      
      if (!goal) {
        return res.status(404).json({ message: 'Learning goal not found' });
      }
      
      res.status(200).json(goal);
    } catch (error) {
      console.error('Error retrieving learning goal:', error);
      res.status(500).json({ message: 'Failed to retrieve learning goal', error: error.message });
    }
  };

  module.exports = {
    uploadLabSheet,
    getAllLabSheets,
    getLabSheetById,
    analyzeLabSheet,
    getLabSheetLearningGoals,
    getLearningGoal
  };
  