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
   * Extract SQL code blocks from text
   * @param {string} text - Text containing code blocks
   * @returns {Array<string>} - Extracted code blocks
   */
  const extractCodeBlocks = (text) => {
    const codeBlocks = [];
    const codeRegex = /```sql\s+([\s\S]+?)\s+```|```\s+([\s\S]+?)\s+```|--\s+([\s\S]+?)(?=--|$)/g;
    
    let match;
    while ((match = codeRegex.exec(text)) !== null) {
      const code = (match[1] || match[2] || match[3]).trim();
      if (isValidSqlSetup(code)) {
        codeBlocks.push(code);
      }
    }
    
    return codeBlocks;
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
    
    // Generate basic tables based on concepts
    if (concepts.includes('Object Tables') || concepts.includes('Object Types')) {
      scripts.push(`
        -- Basic setup for object relational concepts
        CREATE TABLE employees (
          empno VARCHAR(6) PRIMARY KEY,
          firstname VARCHAR(12),
          lastname VARCHAR(15),
          workdept VARCHAR(3),
          sex CHAR(1),
          birthdate DATE,
          salary DECIMAL(8,2)
        );
        
        CREATE TABLE departments (
          deptno VARCHAR(3) PRIMARY KEY,
          deptname VARCHAR(36),
          mgrno VARCHAR(6),
          admrdept VARCHAR(3)
        );
        
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
        -- Views for query practice
        CREATE VIEW dept_emp AS
        SELECT d.deptno, d.deptname, e.empno, e.firstname, e.lastname, e.salary
        FROM departments d
        JOIN employees e ON d.deptno = e.workdept;
      `);
    }
    
    return scripts;
  };
  
  module.exports = {
    generateSetupScripts
  };