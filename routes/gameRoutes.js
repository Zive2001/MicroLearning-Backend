// routes/gameRoutes.js
const express = require('express');
const router = express.Router();
const {
  generateMissions,
  getMissionDetails,
  executeMissionQuery,
  getPlayerProfile
} = require('../controllers/gameController');

// Generate missions for a lab sheet
router.post('/generate/:labSheetId', generateMissions);

// Get mission details
router.get('/mission/:missionId', getMissionDetails);

// Execute a mission query
router.post('/mission/:missionId/execute/:objectiveIndex?', executeMissionQuery);

// Get player profile
router.get('/player', getPlayerProfile);

module.exports = router;