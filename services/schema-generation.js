// services/schema-generation.js

/**
 * Generate setup scripts for a learning goal
 * @param {object} goal - Learning goal object
 * @returns {Promise<Array<string>>} - Array of setup scripts
 */
const generateSetupScripts = async (goal) => {
    // Extract code blocks from example and practice sections
    const scripts = [];
    
    // Check for code blocks in the example section
    const exampleCodeBlocks = extractCodeBlocks(goal.learningPath.example);
    if (exampleCodeBlocks.length > 0) {
      scripts.push(...exampleCodeBlocks);
    }
    
    // If no code blocks found, generate basic setup based on concepts
    if (scripts.length === 0) {
      scripts.push(...generateBasicSetup(goal));
    }
    
    return scripts;
  };
  
  /**
 * Extract SQL code blocks from text and convert Oracle syntax to MySQL if needed
 * @param {string} text - Text containing code blocks
 * @returns {Array<string>} - Extracted code blocks
 */
const extractCodeBlocks = (text) => {
    const codeBlocks = [];
    const codeRegex = /```sql\s+([\s\S]+?)\s+```|```\s+([\s\S]+?)\s+```|--\s+([\s\S]+?)(?=--|$)/g;
    
    let match;
    while ((match = codeRegex.exec(text)) !== null) {
      let code = (match[1] || match[2] || match[3]).trim();
      
      // Convert Oracle-specific syntax to MySQL equivalent
      code = convertOracleToMySQL(code);
      
      if (isValidSqlSetup(code)) {
        codeBlocks.push(code);
      }
    }
    
    return codeBlocks;
  };
  
  /**
   * Convert Oracle syntax to MySQL equivalent
   * @param {string} code - Oracle SQL code
   * @returns {string} - MySQL compatible code
   */
  const convertOracleToMySQL = (code) => {
    // Skip conversion if code appears to be MySQL already
    if (code.includes('ENGINE=InnoDB') || code.includes('AUTO_INCREMENT')) {
      return code;
    }
    
    let mysqlCode = code;
    
    // Replace Oracle object type definitions with MySQL table equivalents
    mysqlCode = mysqlCode.replace(/CREATE\s+(?:OR\s+REPLACE\s+)?TYPE\s+(\w+)\s+AS\s+OBJECT\s*\(([\s\S]+?)\);?/gi, 
      (match, typeName, attributes) => {
        // Convert to a MySQL table
        return `CREATE TABLE IF NOT EXISTS ${typeName} (${attributes});`;
      });
    
    // Replace REF type with foreign key equivalent concept
    mysqlCode = mysqlCode.replace(/(\w+)\s+REF\s+(\w+)/gi, '$1 VARCHAR(36) /* Simulating REF $2 */');
    
    // Replace Oracle table of syntax
    mysqlCode = mysqlCode.replace(/(\w+)\s+TABLE\s+OF\s+(\w+)/gi, 
      'VARCHAR(255) /* Simulating TABLE OF $2 */');
    
    // Handle forward slash SQL delimiters by removing them
    mysqlCode = mysqlCode.replace(/^\/$/gm, '');
    
    return mysqlCode;
  };
  
  /**
   * Check if a code block contains valid SQL setup statements
   * @param {string} code - SQL code
   * @returns {boolean} - Whether the code is valid setup
   */
  const isValidSqlSetup = (code) => {
    const setupKeywords = ['CREATE', 'INSERT', 'ALTER', 'DROP', 'TRUNCATE'];
    const lowerCode = code.toUpperCase();
    
    return setupKeywords.some(keyword => lowerCode.includes(keyword));
  };
  /**
 * Generate basic setup scripts based on learning goal concepts
 * @param {object} goal - Learning goal object
 * @returns {Array<string>} - Generated setup scripts
 */
const generateBasicSetup = (goal) => {
    const scripts = [];
    const concepts = goal.keyConcepts || [];
    
    // Generate MySQL-compatible tables (simulating Oracle object-relational features)
    if (concepts.includes('Object Tables') || concepts.includes('Object Types')) {
      scripts.push(`
        -- Basic setup for simulating object relational concepts in MySQL
        -- This is a simplified version as MySQL doesn't support object types directly
        
        CREATE TABLE IF NOT EXISTS employees (
          empno VARCHAR(6) PRIMARY KEY,
          firstname VARCHAR(12),
          lastname VARCHAR(15),
          workdept VARCHAR(3),
          sex CHAR(1),
          birthdate DATE,
          salary DECIMAL(8,2)
        );
        
        CREATE TABLE IF NOT EXISTS departments (
          deptno VARCHAR(3) PRIMARY KEY,
          deptname VARCHAR(36),
          mgrno VARCHAR(6),
          admrdept VARCHAR(3),
          FOREIGN KEY (mgrno) REFERENCES employees(empno) ON DELETE SET NULL,
          FOREIGN KEY (admrdept) REFERENCES departments(deptno) ON DELETE SET NULL
        );
        
        -- Add workdept foreign key after both tables exist
        ALTER TABLE employees 
        ADD CONSTRAINT fk_workdept 
        FOREIGN KEY (workdept) REFERENCES departments(deptno) ON DELETE SET NULL;
        
        -- Sample data
        INSERT INTO departments VALUES ('A00', 'SPIFFY COMPUTER SERVICE DIV.', '000010', 'A00');
        INSERT INTO departments VALUES ('B01', 'PLANNING', '000020', 'A00');
        INSERT INTO departments VALUES ('C01', 'INFORMATION CENTRE', '000030', 'A00');
        INSERT INTO departments VALUES ('D01', 'DEVELOPMENT CENTRE', '000060', 'C01');
        
        INSERT INTO employees VALUES ('000010', 'CHRISTINE', 'HAAS', 'A00', 'F', '1953-08-14', 72750);
        INSERT INTO employees VALUES ('000020', 'MICHAEL', 'THOMPSON', 'B01', 'M', '1968-02-02', 61250);
        INSERT INTO employees VALUES ('000030', 'SALLY', 'KWAN', 'C01', 'F', '1971-05-11', 58250);
      `);
    }
    
    if (concepts.includes('SQL Queries') || concepts.includes('Object Relational Queries')) {
      scripts.push(`
        -- Views for query practice (simulating object references)
        CREATE VIEW IF NOT EXISTS dept_emp AS
        SELECT d.deptno, d.deptname, e.empno, e.firstname, e.lastname, e.salary
        FROM departments d
        JOIN employees e ON d.deptno = e.workdept;
        
        -- View showing department hierarchy
        CREATE VIEW IF NOT EXISTS dept_hierarchy AS
        SELECT d.deptno, d.deptname, d.admrdept, ad.deptname as admin_deptname
        FROM departments d
        JOIN departments ad ON d.admrdept = ad.deptno;
      `);
    }
    
    return scripts;
  };
  
  
  module.exports = {
    generateSetupScripts
  };