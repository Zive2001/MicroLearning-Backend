// routes/labSheetRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/fileUpload');
const { uploadLabSheet, getAllLabSheets, getLabSheetById } = require('../controllers/labSheetController');

// Upload a lab sheet
router.post('/upload', upload.single('file'), uploadLabSheet);

// Get all lab sheets
router.get('/', getAllLabSheets);

// Get a lab sheet by ID
router.get('/:id', getLabSheetById);

module.exports = router;