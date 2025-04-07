// services/ai-analysis.js
const natural = require('natural');
const createOpenAIClient = require('../utils/openaiConfig');
const { OpenAI } = require('openai');
const tokenizer = new natural.WordTokenizer();
require('dotenv').config();

// Initialize OpenAI API
const openai = createOpenAIClient();

/**
 * Extract key concepts from lab sheet text with a focus on database topics
 * @param {string} text - Lab sheet text content
 * @returns {Promise<Array<string>>} - Extracted key concepts
 */
const extractKeyConcepts = async (text) => {
  try {
    const prompt = `
    You are a database education expert. I'll provide the content of a database lab sheet.
    
    Extract key database concepts from this text. Focus only on database-specific terminology, SQL concepts, 
    and object-relational features. Include specific Oracle database features mentioned.
    
    Return ONLY a JSON object with a "concepts" array containing the extracted concepts as strings.
    
    Lab sheet content:
    ${text.substring(0, 7000)}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Model we have access to
      messages: [
        {
          role: "system",
          content: "You are a database education expert focused on extracting technical database concepts."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const concepts = JSON.parse(response.choices[0].message.content).concepts;
    return concepts || extractKeywordsBasic(text);
  } catch (error) {
    console.error('Error extracting key concepts:', error);
    // Fallback to basic keyword extraction if OpenAI fails
    return extractKeywordsBasic(text);
  }
};

/**
 * Database-specific keyword extraction fallback
 * @param {string} text - Text to extract keywords from
 * @returns {Array<string>} - Extracted keywords
 */
const extractKeywordsBasic = (text) => {
  const tokens = tokenizer.tokenize(text.toLowerCase());
  const dbKeywords = [
    'sql', 'database', 'query', 'table', 'join', 'select', 'from', 'where',
    'object', 'relational', 'type', 'ref', 'primary key', 'foreign key',
    'object table', 'object type', 'department', 'employee', 'oremp', 'ordept',
    'salary', 'constraint', 'script', 'sqlplus', 'echo', 'termout', 'spool',
    'drop', 'force', 'cascade', 'deref', 'dot notation', 'object navigation',
    'create type', 'create table', 'create or replace type', 'nested table',
    'under', 'inheritance', 'object references', 'varray'
  ];
  
  const dbConceptSet = new Set();
  
  // Extract single keywords
  for (const token of tokens) {
    if (dbKeywords.includes(token)) {
      dbConceptSet.add(token);
    }
  }
  
  // Look for multi-word concepts
  const textLower = text.toLowerCase();
  for (const keyword of dbKeywords) {
    if (keyword.includes(' ') && textLower.includes(keyword)) {
      dbConceptSet.add(keyword);
    }
  }
  
  return Array.from(dbConceptSet);
};

/**
 * Chunk the lab sheet content into learning goals based on exercises and sub-exercises
 * @param {object} labSheet - The lab sheet data
 * @returns {Promise<Array<object>>} - Learning goal chunks
 */
const chunkIntoLearningGoals = async (labSheet) => {
  try {
    // Create a detailed prompt with the lab sheet content
    const prompt = `
    You are a database education expert. Analyze this database lab sheet and divide it into 4-6 logical learning goals.
    
    Lab Sheet #${labSheet.labNumber}: ${labSheet.title}
    
    This lab sheet contains the following exercises:
    ${labSheet.exercises.map(ex => 
      `${ex.number}. ${ex.description} ${ex.subExercises.map(sub => `\n   (${sub.letter}) ${sub.description}`).join('')}`
    ).join('\n\n')}
    
    For each learning goal:
    1. Create a clear, specific title that accurately describes the database skill being learned
    2. Identify 3-5 key database concepts that are central to this goal
    3. List the exercise numbers and sub-exercise letters that relate to this goal
    4. Identify any prerequisite knowledge needed
    
    Return a JSON object with a "learningGoals" array of learning goal objects, each containing:
    - title (string)
    - keyConcepts (array of strings)
    - exercises (array of strings like "1", "2a", "3c")
    - prerequisites (array of strings)
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Change from gpt-4 to gpt-3.5-turbo
      messages: [
        {
          role: "system",
          content: "You are a database education expert specializing in creating structured learning paths."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    try {
      const parsedResponse = JSON.parse(response.choices[0].message.content);
      return parsedResponse.learningGoals || fallbackLearningGoals(labSheet);
    } catch (parseError) {
      console.error('Error parsing learning goals response:', parseError);
      return fallbackLearningGoals(labSheet);
    }
  } catch (error) {
    console.error('Error chunking into learning goals:', error);
    return fallbackLearningGoals(labSheet);
  }
};

/**
 * Fallback method to create learning goals based on exercises
 */
const fallbackLearningGoals = (labSheet) => {
  return labSheet.exercises.map((exercise, index) => {
    // Get full exercise text to extract better title
    const exerciseText = exercise.description;
    const shortTitle = exerciseText.split('.')[0].trim();
    
    // Create better title based on the content
    let title = `Learning Goal ${index + 1}: `;
    if (exerciseText.toLowerCase().includes('schema')) {
      title += "Understanding Object Relational Schemas";
    } else if (exerciseText.toLowerCase().includes('queries')) {
      title += "Querying Object Relational Tables";
    } else if (exerciseText.toLowerCase().includes('drop')) {
      title += "Managing Database Objects";
    } else {
      title += shortTitle;
    }
    
    // Extract more specific concepts based on exercise content
    const concepts = [];
    if (exerciseText.toLowerCase().includes('object type')) concepts.push('Object Types');
    if (exerciseText.toLowerCase().includes('ref')) concepts.push('REF Types');
    if (exerciseText.toLowerCase().includes('emp') || exerciseText.toLowerCase().includes('dept')) concepts.push('Object Tables');
    if (exerciseText.toLowerCase().includes('oremp') || exerciseText.toLowerCase().includes('ordept')) concepts.push('Object Relational Queries');
    if (exerciseText.toLowerCase().includes('script')) concepts.push('SQL Scripts');
    if (exerciseText.toLowerCase().includes('echo') || exerciseText.toLowerCase().includes('termout')) concepts.push('SQLPlus Environment Variables');
    if (exerciseText.toLowerCase().includes('drop')) concepts.push('Dropping Database Objects');
    if (exerciseText.toLowerCase().includes('cascade')) concepts.push('Cascading Constraints');
    
    // If no concepts found, add generic ones based on exercise number
    if (concepts.length === 0) {
      if (exercise.number === '1') {
        concepts.push('Object Relational Data Model', 'REF Types', 'Object Types');
      } else if (exercise.number === '2') {
        concepts.push('Object Relational Queries', 'Object Navigation', 'Dot Notation');
      } else if (exercise.number === '3') {
        concepts.push('SQL Scripts', 'SQLPlus Settings', 'Spooling Output');
      } else if (exercise.number === '4') {
        concepts.push('Dropping Objects', 'FORCE Option', 'CASCADE CONSTRAINT');
      }
    }
    
    // Create exercise references including sub-exercises if any
    const exerciseRefs = [`${exercise.number}`];
    if (exercise.subExercises && exercise.subExercises.length > 0) {
      exercise.subExercises.forEach(sub => {
        exerciseRefs.push(`${exercise.number}${sub.letter}`);
      });
    }
    
    return {
      title,
      keyConcepts: concepts,
      exercises: exerciseRefs,
      prerequisites: []
    };
  });
};

/**
 * Generate learning path for each learning goal
 * @param {object} learningGoal - The learning goal
 * @param {object} labSheet - The lab sheet data
 * @returns {Promise<object>} - Complete learning path
 */
const generateLearningPath = async (learningGoal, labSheet) => {
  try {
    // Create a more focused prompt for database learning content
    const prompt = `
    You are a database education expert creating a microlearning path for database students.
    
    Create a complete learning path for this database learning goal:
    
    GOAL: ${learningGoal.title}
    KEY CONCEPTS: ${learningGoal.keyConcepts.join(", ")}
    RELATED EXERCISES: ${learningGoal.exercises.join(", ")}
    
    Generate the following components:
    
    1. CONCEPT: A clear, concise explanation of the database concepts (200-300 words)
    2. EXAMPLE: A practical SQL/Oracle code example demonstrating these concepts
    3. PRACTICE: An interactive SQL exercise with clear instructions for students to implement
    4. CHALLENGE: A more difficult database task to test mastery of the concept
    
    Relevant lab sheet content:
    ${labSheet.exercises
      .filter(ex => learningGoal.exercises.some(goalEx => goalEx.startsWith(ex.number)))
      .map(ex => `${ex.number}. ${ex.description} ${ex.subExercises.map(sub => `\n(${sub.letter}) ${sub.description}`).join('')}`)
      .join('\n\n')}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Change from gpt-4 to gpt-3.5-turbo
      messages: [
        {
          role: "system",
          content: "You are a database education expert creating comprehensive database learning materials."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    try {
      // Parse the response and create a learning path with standard structure
      const content = JSON.parse(response.choices[0].message.content);
      return {
        ...learningGoal,
        learningPath: {
          concept: content.concept || generateFallbackConcept(learningGoal),
          example: content.example || generateFallbackExample(learningGoal),
          practice: content.practice || generateFallbackPractice(learningGoal),
          challenge: content.challenge || generateFallbackChallenge(learningGoal)
        }
      };
    } catch (parseError) {
      console.error('Error parsing learning path response:', parseError);
      return {
        ...learningGoal,
        learningPath: {
          concept: generateFallbackConcept(learningGoal),
          example: generateFallbackExample(learningGoal),
          practice: generateFallbackPractice(learningGoal),
          challenge: generateFallbackChallenge(learningGoal)
        }
      };
    }
  } catch (error) {
    console.error('Error generating learning path:', error);
    
    // Create a fallback learning path focused on the database concepts
    return {
      ...learningGoal,
      learningPath: {
        concept: generateFallbackConcept(learningGoal),
        example: generateFallbackExample(learningGoal),
        practice: generateFallbackPractice(learningGoal),
        challenge: generateFallbackChallenge(learningGoal)
      }
    };
  }
};

// Helper functions for generating better fallback content
function generateFallbackConcept(goal) {
  const concepts = goal.keyConcepts.join(', ');
  
  if (goal.title.toLowerCase().includes('schema')) {
    return `In Oracle's object-relational model, you can define custom object types that represent complex real-world entities. These object types can include attributes and methods, similar to classes in object-oriented programming. When working with ${concepts}, you'll use the CREATE TYPE statement to define the structure, then CREATE TABLE to implement tables based on these types. The lab demonstrates how to use REF types to create relationships between objects, similar to foreign keys in relational databases but with object-oriented navigation capabilities.`;
  } else if (goal.title.toLowerCase().includes('queries')) {
    return `Oracle's object-relational database allows you to query complex objects using dot notation to navigate through object attributes. When working with ${concepts}, you can access attributes of objects directly using the dot operator (e.g., e.workdept.deptname to get the department name of an employee). This approach simplifies queries by eliminating many joins that would be required in purely relational systems. The lab demonstrates various query patterns for retrieving and manipulating data in object-relational tables.`;
  } else if (goal.title.toLowerCase().includes('drop')) {
    return `When working with object-relational databases, dropping object types and tables requires special consideration due to dependencies. ${concepts} often involves handling circular references between types. The FORCE option allows you to drop a type even when other objects depend on it, while CASCADE CONSTRAINT removes a table along with all its dependent constraints. These options help manage the complexity of object-relational schemas where objects reference each other.`;
  } else {
    return `This learning goal focuses on ${concepts} in Oracle's object-relational database system. The object-relational model extends traditional relational databases with object-oriented features, allowing for more complex data structures and relationships. Understanding these concepts is essential for designing and implementing efficient database solutions for complex real-world problems.`;
  }
}

function generateFallbackExample(goal) {
  if (goal.title.toLowerCase().includes('schema')) {
    return `-- Creating object types with REF relationships\n\n-- Define the department type\nCREATE OR REPLACE TYPE dept_t AS OBJECT (\n  deptno CHAR(3),\n  deptname VARCHAR(36),\n  mgrno CHAR(6),\n  admrdept REF dept_t\n);\n/\n\n-- Define the employee type with reference to dept\nCREATE OR REPLACE TYPE emp_t AS OBJECT (\n  empno CHAR(6),\n  firstname VARCHAR(12),\n  lastname VARCHAR(15),\n  workdept REF dept_t,\n  sex CHAR(1),\n  birthdate DATE,\n  salary NUMBER(8,2)\n);\n/\n\n-- Create tables based on these types\nCREATE TABLE ordept OF dept_t (\n  PRIMARY KEY (deptno)\n);\n\nCREATE TABLE oremp OF emp_t (\n  PRIMARY KEY (empno)\n);\n/`;
  } else if (goal.title.toLowerCase().includes('queries')) {
    return `-- Example queries using object-relational dot notation\n\n-- Get department name and manager's lastname\nSELECT d.deptno, d.deptname, DEREF(d.mgrno).lastname\nFROM ordept d;\n\n-- Get employee details with department name\nSELECT e.empno, e.lastname, DEREF(e.workdept).deptname\nFROM oremp e;\n\n-- Show average salary by department and gender\nSELECT DEREF(e.workdept).deptno AS deptno,\n       DEREF(e.workdept).deptname AS deptname,\n       e.sex,\n       AVG(e.salary) AS avg_salary\nFROM oremp e\nGROUP BY DEREF(e.workdept).deptno, DEREF(e.workdept).deptname, e.sex;\n/`;
  } else if (goal.title.toLowerCase().includes('drop')) {
    return `-- Examples of dropping object-relational schema objects\n\n-- Dropping a type with dependencies using FORCE\nDROP TYPE emp_t FORCE;\n\n-- Dropping a table with cascade constraints\nDROP TABLE ordept CASCADE CONSTRAINTS;\n\n-- Complete cleanup of all types\nDROP TYPE dept_t FORCE;\n/`;
  } else {
    return `-- Example SQL code related to ${goal.keyConcepts.join(' and ')}\n\n-- Create a type\nCREATE OR REPLACE TYPE address_t AS OBJECT (\n  street VARCHAR(30),\n  city VARCHAR(20),\n  state CHAR(2),\n  zip VARCHAR(10)\n);\n/\n\n-- Use the type in a table\nCREATE TABLE employees (\n  empid NUMBER PRIMARY KEY,\n  name VARCHAR(50),\n  home_address address_t,\n  work_address address_t\n);\n/`;
  }
}

function generateFallbackPractice(goal) {
  if (goal.title.toLowerCase().includes('schema')) {
    return `# Practice Exercise: Creating Object Types and Tables\n\n1. Define an object type called 'address_t' with attributes for street_no, street_name, suburb, state, and pin.\n2. Define object types for 'stock_t' and 'client_t' similar to the lab sheet examples.\n3. Create object tables for these types with appropriate primary keys.\n4. Insert sample data into your tables.\n\nHint: Remember to use the syntax 'CREATE OR REPLACE TYPE type_name AS OBJECT (...)' for defining types.`;
  } else if (goal.title.toLowerCase().includes('queries')) {
    return `# Practice Exercise: Querying Object-Relational Tables\n\n1. Write a query to get the department name and manager's lastname for all departments using dot notation.\n2. Write a query to get the employee number, lastname, and their department name using object references.\n3. Write a query to display the average salary for men and women in each department.\n\nHint: Use DEREF() to dereference REF type attributes and then use dot notation to access the attributes of the referenced object.`;
  } else if (goal.title.toLowerCase().includes('drop')) {
    return `# Practice Exercise: Managing Object Dependencies\n\n1. Create a SQL script that will drop all your object tables and types from the lab.\n2. Make sure to handle the dependencies correctly, using FORCE and CASCADE CONSTRAINTS where needed.\n3. Test your script to ensure it runs without errors.\n\nHint: Consider the order of dropping objects - tables usually need to be dropped before types, unless you use FORCE.`;
  } else {
    return `# Practice Exercise\n\nTry to implement the following tasks related to ${goal.keyConcepts.join(' and ')}:\n\n1. Examine the lab sheet example carefully\n2. Identify the key components and syntax requirements\n3. Create your own implementation following the pattern shown\n4. Test your solution with appropriate queries\n\nHint: Pay attention to the exact syntax and order of operations shown in the examples.`;
  }
}

function generateFallbackChallenge(goal) {
  if (goal.title.toLowerCase().includes('schema')) {
    return `# Challenge: Extended Object-Relational Schema\n\nExtend the object model from the lab sheet to include:\n\n1. A project_t object type with attributes for project ID, name, budget, and start date\n2. Add a reference from emp_t to project_t to represent the employee's main project\n3. Implement a nested table to store multiple projects an employee might be working on\n4. Create tables and insert appropriate sample data\n5. Write queries to demonstrate the relationships between employees and projects\n\nThis will test your understanding of more advanced object-relational concepts.`;
  } else if (goal.title.toLowerCase().includes('queries')) {
    return `# Challenge: Advanced Object-Relational Queries\n\n1. Write a query that shows a department hierarchy by navigating through the admrdept references recursively\n2. Create a query that displays the total salary budget for each manager, showing all employees in their department\n3. Implement a query that finds all employees who earn more than their department's manager\n4. Create a query to calculate the amount each department's average salary differs from the company-wide average\n\nThis will test your ability to write complex queries using object navigation and analytic functions.`;
  } else if (goal.title.toLowerCase().includes('drop')) {
    return `# Challenge: Database Refactoring\n\n1. Create a script that will:\n   - Extract all data from your current object-relational schema\n   - Drop all existing types and tables\n   - Create a new, improved schema with inheritance (using UNDER keyword)\n   - Reinsert the data into the new structure\n\n2. The new schema should implement proper inheritance between a person_t supertype and employee_t/manager_t subtypes\n\nThis will test your ability to manage complex schema changes while preserving data.`;
  } else {
    return `# Challenge: Advanced Implementation\n\nCreate a comprehensive solution that demonstrates mastery of ${goal.keyConcepts.join(' and ')}:\n\n1. Design an extended version of the lab sheet example that incorporates additional complexity\n2. Implement all required types, tables, and relationships\n3. Create a set of queries that demonstrate navigation through the object structure\n4. Document your solution with comments explaining your design decisions\n\nThis challenge will test your understanding of advanced object-relational concepts and your ability to apply them to solve complex problems.`;
  }
}

// Handle retry mechanism for API calls
async function retryOperation(operation, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's a quota error or model not found error
      if (error.code === 'insufficient_quota' || error.code === 'model_not_found') {
        throw error;
      }
      
      console.log(`Attempt ${attempt} failed. Retrying in ${initialDelay * attempt}ms...`);
      await new Promise(resolve => setTimeout(resolve, initialDelay * attempt));
    }
  }
  
  throw lastError;
}

// Wrap the critical OpenAI calls with retry logic
const extractKeyConceptsWithRetry = async (text) => {
  return retryOperation(() => extractKeyConcepts(text));
};

const chunkIntoLearningGoalsWithRetry = async (labSheet) => {
  return retryOperation(() => chunkIntoLearningGoals(labSheet));
};

const generateLearningPathWithRetry = async (learningGoal, labSheet) => {
  return retryOperation(() => generateLearningPath(learningGoal, labSheet));
};

module.exports = {
  extractKeyConcepts: extractKeyConceptsWithRetry,
  chunkIntoLearningGoals: chunkIntoLearningGoalsWithRetry,
  generateLearningPath: generateLearningPathWithRetry
};