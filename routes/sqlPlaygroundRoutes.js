// routes/sqlPlaygroundRoutes.js
const express = require('express');
const router = express.Router();
const {
  executeUserQuery,
  validateUserQuery,
  setupEnvironment,
  evaluateSolution,
  setupTestEnvironment
} = require('../controllers/sqlPlaygroundController');

// Execute a SQL query
router.post('/execute', executeUserQuery);

// Validate a SQL query
router.post('/validate', validateUserQuery);

// Setup environment for a specific learning goal
router.get('/setup/:goalId', setupEnvironment);

// Evaluate a solution
router.post('/evaluate/:goalId', evaluateSolution);

// Setup test environment
router.get('/setup-test', setupTestEnvironment);

module.exports = router;