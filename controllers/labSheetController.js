// controllers/labSheetController.js
const fs = require('fs');
const path = require('path');
const { extractPdfContent, processLabSheet } = require('../services/pdf-extraction');
const LabSheet = require('../models/LabSheet');

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

module.exports = {
  uploadLabSheet,
  getAllLabSheets,
  getLabSheetById
};