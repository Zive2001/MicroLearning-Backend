// services/schema-generation.js

/**
 * Generate setup scripts for a learning goal specifically for Oracle
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
      scripts.push(...generateBasicOracleSetup(goal));
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
   * Generate basic Oracle setup scripts based on learning goal concepts
   * @param {object} goal - Learning goal object
   * @returns {Array<string>} - Generated setup scripts
   */
  const generateBasicOracleSetup = (goal) => {
    const scripts = [];
    const concepts = goal.keyConcepts || [];
    
    // Generate basic Oracle object-relational model
    if (concepts.includes('Object Tables') || concepts.includes('Object Types')) {
      scripts.push(`
  CREATE OR REPLACE TYPE dept_t AS OBJECT (
    deptno CHAR(3),
    deptname VARCHAR2(36),
    mgrno CHAR(6),
    admrdept REF dept_t
  );
  
  CREATE OR REPLACE TYPE emp_t AS OBJECT (
    empno CHAR(6),
    firstname VARCHAR2(12),
    lastname VARCHAR2(15),
    workdept REF dept_t,
    sex CHAR(1),
    birthdate DATE,
    salary NUMBER(8,2)
  );
  
  CREATE TABLE ordept OF dept_t (
    PRIMARY KEY (deptno)
  );
  
  CREATE TABLE oremp OF emp_t (
    PRIMARY KEY (empno)
  );
  
  INSERT INTO ordept VALUES ('A00', 'SPIFFY COMPUTER SERVICE DIV.', '000010', NULL);
  INSERT INTO ordept VALUES ('B01', 'PLANNING', '000020', NULL);
  INSERT INTO ordept VALUES ('C01', 'INFORMATION CENTRE', '000030', NULL);
  INSERT INTO ordept VALUES ('D01', 'DEVELOPMENT CENTRE', '000060', NULL);
  
  INSERT INTO oremp VALUES ('000010', 'CHRISTINE', 'HAAS', NULL, 'F', TO_DATE('14-AUG-1953', 'DD-MON-YYYY'), 72750);
  INSERT INTO oremp VALUES ('000020', 'MICHAEL', 'THOMPSON', NULL, 'M', TO_DATE('02-FEB-1968', 'DD-MON-YYYY'), 61250);
  INSERT INTO oremp VALUES ('000030', 'SALLY', 'KWAN', NULL, 'F', TO_DATE('11-MAY-1971', 'DD-MON-YYYY'), 58250);
  INSERT INTO oremp VALUES ('000060', 'IRVING', 'STERN', NULL, 'M', TO_DATE('07-JUL-1965', 'DD-MON-YYYY'), 55555);
      `);
      
      // Add a second script for the REF updates
      scripts.push(`
  UPDATE oremp e
  SET e.workdept = (SELECT REF(d) FROM ordept d WHERE d.deptno = 'A00')
  WHERE e.empno = '000010';
  
  UPDATE oremp e
  SET e.workdept = (SELECT REF(d) FROM ordept d WHERE d.deptno = 'B01')
  WHERE e.empno = '000020';
  
  UPDATE oremp e
  SET e.workdept = (SELECT REF(d) FROM ordept d WHERE d.deptno = 'C01')
  WHERE e.empno = '000030';
  
  UPDATE oremp e
  SET e.workdept = (SELECT REF(d) FROM ordept d WHERE d.deptno = 'D01')
  WHERE e.empno = '000060';
  
  UPDATE ordept d
  SET d.admrdept = (SELECT REF(a) FROM ordept a WHERE a.deptno = 'A00')
  WHERE d.deptno IN ('B01', 'C01');
  
  UPDATE ordept d
  SET d.admrdept = (SELECT REF(a) FROM ordept a WHERE a.deptno = 'C01')
  WHERE d.deptno = 'D01';
      `);
    }
    
    // Add view for queries if needed
    if (concepts.includes('SQL Queries') || concepts.includes('Object Relational Queries')) {
      scripts.push(`
  CREATE OR REPLACE VIEW dept_emp AS
  SELECT d.deptno, d.deptname, 
         e.empno, e.firstname, e.lastname, e.salary
  FROM ordept d, oremp e
  WHERE DEREF(e.workdept).deptno = d.deptno;
      `);
    }
    
    return scripts;
  };
  module.exports = {
    generateSetupScripts
  };