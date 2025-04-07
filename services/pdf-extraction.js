// services/pdf-extraction.js
const fs = require('fs');
const pdfParse = require('pdf-parse');

/**
 * Extract text content from a PDF file
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<object>} - Extracted content and metadata
 */
const extractPdfContent = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    
    return {
      text: data.text,
      numPages: data.numpages,
      info: data.info,
      metadata: data.metadata
    };
  } catch (error) {
    console.error('Error extracting PDF content:', error);
    throw new Error('Failed to extract content from PDF');
  }
};

/**
 * Process lab sheet content to extract structured data
 * @param {object} pdfData - The extracted PDF data
 * @returns {object} - Structured data from the lab sheet
 */
const processLabSheet = (pdfData) => {
  const text = pdfData.text;
  
  // Extract lab sheet number
  const labSheetMatch = text.match(/Laboratory\s+Worksheet\s+(\d+)/i);
  const labSheetNumber = labSheetMatch ? labSheetMatch[1] : 'Unknown';
  
  // Extract topic/title
  const titleMatch = text.match(/Writing\s+Member\s+Methods|Create\s+and\s+Query\s+Object\s+Relational\s+Tables/i);
  const title = titleMatch ? titleMatch[0] : 'Unknown';
  
  // Extract exercises and their descriptions
  const exercises = [];
  const exerciseMatches = text.match(/\d+\.\s+[A-Z][^0-9]+/g);
  
  if (exerciseMatches) {
    exerciseMatches.forEach(exercise => {
      // Clean up the exercise text
      const cleanExercise = exercise.trim();
      exercises.push(cleanExercise);
    });
  }
  
  return {
    labSheetNumber,
    title,
    exercises,
    rawText: text
  };
};

module.exports = {
  extractPdfContent,
  processLabSheet
};