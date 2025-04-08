// services/sql-execution.js
const oracledb = require('oracledb');
const config = require('../config/db-config');

// Initialize Oracle connection pool
let pool = null;

/**
 * Initialize the Oracle connection pool
 */
const initializePool = async () => {
  try {
    // Set Oracle connection mode to OBJECT
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    
    // Create a connection pool
    pool = await oracledb.createPool({
      user: config.ORACLE_USER,
      password: config.ORACLE_PASSWORD,
      connectString: config.ORACLE_CONNECT_STRING,
      poolMin: config.ORACLE_POOL_MIN,
      poolMax: config.ORACLE_POOL_MAX,
      poolIncrement: config.ORACLE_POOL_INCREMENT
    });
    
    console.log('Oracle connection pool initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Oracle connection pool:', error);
    throw error;
  }
};

/**
 * Execute a SQL query
 * @param {string} query - The SQL query to execute
 * @param {Array} bindParams - Query parameters
 * @param {string} sessionId - User session ID for isolation
 * @returns {Promise<object>} - Query results
 */
const executeQuery = async (query, bindParams = {}, sessionId = null) => {
  if (!pool) {
    await initializePool();
  }

  // Skip empty queries
  if (!query || !query.trim()) {
    return {
      success: false,
      error: "Empty query"
    };
  }

  let connection;
  try {
    // Get connection from pool
    connection = await pool.getConnection();
    
    console.log("Executing Oracle query:", query);
    
    // Split into multiple statements if needed
    const statements = query.split(';').filter(stmt => stmt.trim());
    const results = [];
    
    for (const stmt of statements) {
      if (!stmt.trim()) continue;
      
      try {
        console.log("Executing statement:", stmt.trim());
        const result = await connection.execute(stmt.trim(), bindParams, { autoCommit: true });
        results.push({
          success: true,
          statement: stmt.trim(),
          affectedRows: result.rowsAffected || 0
        });
      } catch (err) {
        console.error("Statement execution error:", err.message);
        results.push({
          success: false,
          error: err.message,
          errorNum: err.errorNum,
          statement: stmt.trim()
        });
      }
    }
    
    // Check overall success
    const allSuccessful = results.every(r => r.success);
    
    return {
      success: allSuccessful,
      results,
      message: allSuccessful ? 'All statements executed successfully' : 'Some statements failed'
    };
  } catch (error) {
    console.error("Oracle query execution error:", error.message);
    return {
      success: false,
      error: error.message,
      errorNum: error.errorNum,
      query: query.substring(0, 100) + (query.length > 100 ? '...' : '')
    };
  } finally {
    // Release connection back to the pool
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
  }
};
/**
 * Execute multiple statements with commit/rollback handling
 * @param {Array<string>} statements - Array of SQL statements
 * @param {string} sessionId - User session ID
 * @returns {Promise<object>} - Execution results
 */
const executeMultipleStatements = async (statements, sessionId = null) => {
  if (!pool) {
    await initializePool();
  }

  let connection;
  try {
    // Get connection from pool
    connection = await pool.getConnection();
    
    // Disable autocommit
    await connection.execute("SET TRANSACTION READ WRITE");
    
    const results = [];
    let successful = true;
    
    // Execute each statement
    for (const stmt of statements) {
      if (!stmt.trim()) continue;
      
      try {
        const result = await connection.execute(stmt);
        results.push({
          success: true,
          statement: stmt.substring(0, 100) + (stmt.length > 100 ? '...' : ''),
          affectedRows: result.rowsAffected || 0
        });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          errorNum: error.errorNum,
          statement: stmt.substring(0, 100) + (stmt.length > 100 ? '...' : '')
        });
        successful = false;
        break; // Stop on first error
      }
    }
    
    // Commit or rollback based on success
    if (successful) {
      await connection.commit();
    } else {
      await connection.rollback();
    }
    
    return {
      success: successful,
      message: successful ? 'All statements executed successfully' : 'Execution failed with errors',
      results
    };
  } catch (error) {
    // Rollback on any error
    if (connection) {
      try {
        await connection.rollback();
      } catch (err) {
        console.error("Error during rollback:", err);
      }
    }
    
    return {
      success: false,
      error: error.message,
      results: []
    };
  } finally {
    // Release connection back to the pool
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
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

  let connection;
  try {
    // Get connection from pool
    connection = await pool.getConnection();
    
    // Attempt to parse the query without executing
    const result = await connection.execute(
      `BEGIN
         DBMS_SQL.PARSE(:sql_text, DBMS_SQL.NATIVE);
         :valid := 1;
       EXCEPTION
         WHEN OTHERS THEN
           :valid := 0;
           :error_msg := SQLERRM;
       END;`,
      {
        sql_text: query,
        valid: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        error_msg: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 4000 }
      }
    );
    
    return {
      valid: result.outBinds.valid === 1,
      error: result.outBinds.valid === 0 ? result.outBinds.error_msg : null
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  } finally {
    // Release connection back to the pool
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
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

  // Create a safe identifier prefix for the session
  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 20);
  
  // Filter and split scripts into statements
  const statements = [];
  for (const script of setupScripts) {
    // Split script into separate statements
    const individualStatements = splitOracleStatements(script);
    
    for (let stmt of individualStatements) {
      if (!stmt.trim()) continue;
      
      // Replace generic table/type names with session-specific ones
      stmt = stmt.replace(/CREATE\s+(OR\s+REPLACE\s+)?(TABLE|TYPE|VIEW)\s+(?!IF\s+NOT\s+EXISTS\s+)(\w+)/gi, 
        `CREATE $1$2 ${safeSessionId}_$3`);
        
      // Also update references to these tables/types in other statements
      stmt = stmt.replace(/\b(FROM|JOIN|INTO|TABLE\s+OF|REF)\s+(\w+)/gi, (match, keyword, name) => {
        // Don't replace system table names or already prefixed names
        if (name.startsWith(safeSessionId + '_') || 
            ['dual', 'user_tables', 'all_tables', 'user_types', 'all_types'].includes(name.toLowerCase())) {
          return match;
        }
        return `${keyword} ${safeSessionId}_${name}`;
      });
      
      statements.push(stmt);
    }
  }
  
  // Execute the statements
  const result = await executeMultipleStatements(statements, sessionId);
  
  return {
    ...result,
    sessionId: safeSessionId
  };
};

/**
 * Split Oracle SQL script into individual statements
 * @param {string} script - Oracle SQL script
 * @returns {Array<string>} - Individual statements
 */
// In services/sql-execution.js
const splitOracleStatements = (script) => {
  // First, properly format the script by ensuring comments are properly marked
  let cleanScript = script.replace(/^([A-Za-z].+)/gm, (match) => {
    if (match.trim().startsWith('--')) return match;
    if (match.trim().startsWith('/')) return match;
    if (match.trim().startsWith('*')) return match;
    return `-- ${match}`; // Convert unmarked comments to proper SQL comments
  });
  
  const statements = [];
  let currentStatement = '';
  let inPLSQL = false;
  let slashPending = false;
  
  const lines = cleanScript.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Handle slash as statement terminator (for PL/SQL blocks)
    if (line === '/' && slashPending) {
      statements.push(currentStatement.trim());
      currentStatement = '';
      slashPending = false;
      inPLSQL = false;
      continue;
    }
    
    // Check for PL/SQL blocks
    if (!inPLSQL && (
        line.toUpperCase().startsWith('BEGIN') || 
        line.toUpperCase().startsWith('DECLARE') ||
        line.toUpperCase().match(/^\s*CREATE\s+(OR\s+REPLACE\s+)?(PROCEDURE|FUNCTION|TRIGGER|PACKAGE|TYPE)/i))) {
      inPLSQL = true;
    }
    
    // Add line to current statement
    if (line !== '/') { // Don't include the slash in the statement
      currentStatement += line + '\n';
    }
    
    // Check for statement end
    if (line === '/') {
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
      inPLSQL = false;
    } else if (!inPLSQL && line.endsWith(';')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    } else if (inPLSQL && line.toUpperCase().endsWith('END;')) {
      slashPending = true;
    }
  }
  
  // Add any remaining statement
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }
  
  return statements.filter(stmt => {
    // Remove statements that are just comments
    const nonCommentLines = stmt.split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .filter(line => line.trim());
    return nonCommentLines.length > 0;
  });
};

module.exports = {
  initializePool,
  executeQuery,
  validateQuery,
  resetEnvironment,
  executeMultipleStatements
};