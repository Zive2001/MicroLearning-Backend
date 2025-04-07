// routes/labSheetRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/fileUpload');
const { 
  uploadLabSheet, 
  getAllLabSheets, 
  getLabSheetById,
  analyzeLabSheet,
  getLabSheetLearningGoals,
  getLearningGoal
} = require('../controllers/labSheetController');

// Upload a lab sheet
router.post('/upload', upload.single('labSheet'), uploadLabSheet);

// Get all lab sheets
router.get('/', getAllLabSheets);

// Get a lab sheet by ID
router.get('/:id', getLabSheetById);

// Analyze a lab sheet and generate learning content
router.post('/:id/analyze', analyzeLabSheet);

// Get learning goals for a lab sheet
router.get('/:id/learning-goals', getLabSheetLearningGoals);

// Get a specific learning goal
router.get('/learning-goals/:goalId', getLearningGoal);

module.exports = router;