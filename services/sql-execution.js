// services/sql-execution.js
const mysql = require('mysql2/promise');
const config = require('../config/db-config');

let pool = null;

/**
 * Initialize the database pool
 */
const initializePool = async () => {
  try {
    pool = mysql.createPool({
      host: config.SQL_HOST,
      user: config.SQL_USER,
      password: config.SQL_PASSWORD,
      database: config.SQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log('SQL execution pool initialized successfully');
  } catch (error) {
    console.error('Failed to initialize SQL execution pool:', error);
    throw error;
  }
};

/**
 * Execute a SQL query
 * @param {string} query - The SQL query to execute
 * @param {Array} params - Query parameters
 * @param {string} sessionId - User session ID for isolation
 * @returns {Promise<object>} - Query results
 */
const executeQuery = async (query, params = [], sessionId = null) => {
  if (!pool) {
    await initializePool();
  }

  try {
    // Add session context if provided
    let sessionQuery = query;
    if (sessionId) {
      // For now we'll just log it, but in production this would establish session context
      console.log(`Executing in session: ${sessionId}`);
    }

    // Execute the query
    const startTime = Date.now();
    const [results, fields] = await pool.execute(sessionQuery, params);
    const executionTime = Date.now() - startTime;

    return {
      success: true,
      results,
      fields: fields ? fields.map(f => f.name) : [],
      affectedRows: results.affectedRows,
      executionTime
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      sqlState: error.sqlState,
      code: error.code
    };
  }
};

/**
 * Validate a SQL query without executing it
 * @param {string} query - The SQL query to validate
 * @returns {Promise<object>} - Validation result
 */
const validateQuery = async (query) => {
  if (!pool) {
    await initializePool();
  }

  try {
    // Use EXPLAIN to validate query syntax without executing
    const [results] = await pool.execute(`EXPLAIN ${query}`);
    return {
      valid: true,
      queryPlan: results
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
};

/**
 * Reset a user's session database environment
 * @param {string} sessionId - User session ID
 * @param {Array<string>} setupScripts - Scripts to initialize the environment
 * @returns {Promise<object>} - Reset result
 */
const resetEnvironment = async (sessionId, setupScripts = []) => {
  if (!pool) {
    await initializePool();
  }

  try {
    // Create session-specific tables with prefix
    const results = [];
    
    for (const script of setupScripts) {
      // Replace table names with session-specific names
      const sessionScript = script.replace(/CREATE\s+TABLE\s+(\w+)/gi, 
        `CREATE TABLE IF NOT EXISTS ${sessionId}_$1`);
      
      const result = await executeQuery(sessionScript);
      results.push(result);
    }
    
    return {
      success: true,
      message: 'Environment reset successfully',
      results
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  initializePool,
  executeQuery,
  validateQuery,
  resetEnvironment
};