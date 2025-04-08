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
    const userId = req.userId || 'anonymous';
    const sessionId = `${userId}_${Date.now()}`;
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 20);
    
    // Get the learning goal details
    const goal = await LearningGoal.findById(goalId);
    
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Learning goal not found'
      });
    }
    
    // Create a hardcoded script based on the goal type
    let script = '';
    
    // Check goal keywords to determine appropriate script
    const goalTitle = goal.title.toLowerCase();
    const goalConcepts = goal.keyConcepts.map(c => c.toLowerCase());
    
    if (goalTitle.includes('schema') || 
        goalConcepts.includes('object types') || 
        goalConcepts.includes('object tables')) {
      // Script for object-relational schema 
      script = `
CREATE TABLE ${safeSessionId}_departments (
  deptno VARCHAR2(3) PRIMARY KEY,
  deptname VARCHAR2(36),
  mgrno VARCHAR2(6),
  admrdept VARCHAR2(3)
);

CREATE TABLE ${safeSessionId}_employees (
  empno VARCHAR2(6) PRIMARY KEY,
  firstname VARCHAR2(12),
  lastname VARCHAR2(15),
  workdept VARCHAR2(3),
  sex CHAR(1),
  birthdate DATE,
  salary NUMBER(8,2),
  CONSTRAINT fk_workdept FOREIGN KEY (workdept) REFERENCES ${safeSessionId}_departments(deptno)
);

INSERT INTO ${safeSessionId}_departments VALUES ('A00', 'SPIFFY COMPUTER SERVICE DIV.', '000010', 'A00');
INSERT INTO ${safeSessionId}_departments VALUES ('B01', 'PLANNING', '000020', 'A00');
INSERT INTO ${safeSessionId}_departments VALUES ('C01', 'INFORMATION CENTRE', '000030', 'A00');
INSERT INTO ${safeSessionId}_departments VALUES ('D01', 'DEVELOPMENT CENTRE', '000060', 'C01');

INSERT INTO ${safeSessionId}_employees VALUES ('000010', 'CHRISTINE', 'HAAS', 'A00', 'F', TO_DATE('14-AUG-1953', 'DD-MON-YYYY'), 72750);
INSERT INTO ${safeSessionId}_employees VALUES ('000020', 'MICHAEL', 'THOMPSON', 'B01', 'M', TO_DATE('02-FEB-1968', 'DD-MON-YYYY'), 61250);
INSERT INTO ${safeSessionId}_employees VALUES ('000030', 'SALLY', 'KWAN', 'C01', 'F', TO_DATE('11-MAY-1971', 'DD-MON-YYYY'), 58250);
INSERT INTO ${safeSessionId}_employees VALUES ('000060', 'IRVING', 'STERN', 'D01', 'M', TO_DATE('07-JUL-1965', 'DD-MON-YYYY'), 55555);

CREATE VIEW ${safeSessionId}_dept_emp AS
SELECT d.deptno, d.deptname, e.empno, e.firstname, e.lastname, e.salary
FROM ${safeSessionId}_departments d
JOIN ${safeSessionId}_employees e ON d.deptno = e.workdept;
      `;
    } else if (goalTitle.includes('queries') || 
               goalConcepts.includes('sql queries') || 
               goalConcepts.includes('object relational queries')) {
      // Script for query exercises
      script = `
CREATE TABLE ${safeSessionId}_departments (
  deptno VARCHAR2(3) PRIMARY KEY,
  deptname VARCHAR2(36),
  mgrno VARCHAR2(6),
  admrdept VARCHAR2(3)
);

CREATE TABLE ${safeSessionId}_employees (
  empno VARCHAR2(6) PRIMARY KEY,
  firstname VARCHAR2(12),
  lastname VARCHAR2(15),
  workdept VARCHAR2(3),
  sex CHAR(1),
  birthdate DATE,
  salary NUMBER(8,2),
  CONSTRAINT fk_workdept FOREIGN KEY (workdept) REFERENCES ${safeSessionId}_departments(deptno)
);

INSERT INTO ${safeSessionId}_departments VALUES ('A00', 'SPIFFY COMPUTER SERVICE DIV.', '000010', 'A00');
INSERT INTO ${safeSessionId}_departments VALUES ('B01', 'PLANNING', '000020', 'A00');
INSERT INTO ${safeSessionId}_departments VALUES ('C01', 'INFORMATION CENTRE', '000030', 'A00');
INSERT INTO ${safeSessionId}_departments VALUES ('D01', 'DEVELOPMENT CENTRE', '000060', 'C01');

INSERT INTO ${safeSessionId}_employees VALUES ('000010', 'CHRISTINE', 'HAAS', 'A00', 'F', TO_DATE('14-AUG-1953', 'DD-MON-YYYY'), 72750);
INSERT INTO ${safeSessionId}_employees VALUES ('000020', 'MICHAEL', 'THOMPSON', 'B01', 'M', TO_DATE('02-FEB-1968', 'DD-MON-YYYY'), 61250);
INSERT INTO ${safeSessionId}_employees VALUES ('000030', 'SALLY', 'KWAN', 'C01', 'F', TO_DATE('11-MAY-1971', 'DD-MON-YYYY'), 58250);
INSERT INTO ${safeSessionId}_employees VALUES ('000060', 'IRVING', 'STERN', 'D01', 'M', TO_DATE('07-JUL-1965', 'DD-MON-YYYY'), 55555);
INSERT INTO ${safeSessionId}_employees VALUES ('000050', 'JOHN', 'GEYER', 'C01', 'M', TO_DATE('15-SEP-1955', 'DD-MON-YYYY'), 60175);
INSERT INTO ${safeSessionId}_employees VALUES ('000070', 'EVA', 'PULASKI', 'D01', 'F', TO_DATE('26-MAY-1973', 'DD-MON-YYYY'), 56170);

CREATE VIEW ${safeSessionId}_dept_emp AS
SELECT d.deptno, d.deptname, e.empno, e.firstname, e.lastname, e.salary
FROM ${safeSessionId}_departments d
JOIN ${safeSessionId}_employees e ON d.deptno = e.workdept;

CREATE VIEW ${safeSessionId}_dept_hierarchy AS
SELECT d.deptno, d.deptname, d.admrdept, ad.deptname as admin_deptname
FROM ${safeSessionId}_departments d
JOIN ${safeSessionId}_departments ad ON d.admrdept = ad.deptno;

CREATE VIEW ${safeSessionId}_dept_stats AS
SELECT d.deptno, d.deptname, 
       COUNT(e.empno) as emp_count,
       AVG(e.salary) as avg_salary,
       MAX(e.salary) as max_salary,
       MIN(e.salary) as min_salary
FROM ${safeSessionId}_departments d
JOIN ${safeSessionId}_employees e ON d.deptno = e.workdept
GROUP BY d.deptno, d.deptname;
      `;
    } else {
      // Default script for other goals
      script = `
CREATE TABLE ${safeSessionId}_employees (
  empno VARCHAR2(6) PRIMARY KEY,
  firstname VARCHAR2(12),
  lastname VARCHAR2(15),
  salary NUMBER(8,2)
);

INSERT INTO ${safeSessionId}_employees VALUES ('000010', 'CHRISTINE', 'HAAS', 72750);
INSERT INTO ${safeSessionId}_employees VALUES ('000020', 'MICHAEL', 'THOMPSON', 61250);
      `;
    }
    
    // Execute the script using our working executeQuery function
    const result = await executeQuery(script);
    
    res.status(200).json({
      success: result.success,
      message: result.success ? 'Environment setup successful' : 'Environment setup failed',
      results: result.results || [],
      sessionId: safeSessionId,
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
    
    // For now, simple evaluation - we'll just check if the query executed successfully
    const evaluation = {
      correct: result.success,
      feedback: result.success ? 
        'Your solution executed successfully!' : 
        `There was an error: ${result.error || 'Unknown error'}`,
      points: result.success ? (isChallenge ? 10 : 5) : 0,
      executionResult: result
    };
    
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