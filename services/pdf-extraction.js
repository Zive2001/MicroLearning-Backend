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
  let title = 'Unknown';
  const titleMatches = [
    /Create\s+and\s+Query\s+Object\s+Relational\s+Tables/i,
    /Writing\s+Member\s+Methods/i,
    /Database\s+Systems/i
  ];
  
  for (const pattern of titleMatches) {
    const match = text.match(pattern);
    if (match) {
      title = match[0];
      break;
    }
  }
  
  // Extract exercises
  const exercises = [];
  const exerciseRegex = /(\d+)\.\s+(.*?)(?=\d+\.\s+|$)/gs;
  let match;
  
  while ((match = exerciseRegex.exec(text)) !== null) {
    const exerciseNum = match[1];
    const exerciseContent = match[2].trim();
    
    // Extract sub-exercises
    const subExercises = [];
    const subExRegex = /\(([a-z])\)\s+(.*?)(?=\([a-z]\)\s+|$)/gs;
    let subMatch;
    
    let subContent = exerciseContent;
    while ((subMatch = subExRegex.exec(subContent)) !== null) {
      subExercises.push({
        letter: subMatch[1],
        description: subMatch[2].trim() || `Sub-exercise ${subMatch[1]}`
      });
    }
    
    // Make sure description is never empty
    const description = exerciseContent.split(/\([a-z]\)/)[0].trim() || `Exercise ${exerciseNum}`;
    
    exercises.push({
      number: exerciseNum,
      description: description,
      subExercises
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