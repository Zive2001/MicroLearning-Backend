// services/mission-generator.js
const GameMission = require('../models/GameMission');
const LearningGoal = require('../models/LearningGoal');

/**
 * Generate game missions from learning goals
 * @param {string} labSheetId - ID of the lab sheet
 * @returns {Promise<Array>} - Generated missions
 */
const generateMissionsFromLearningGoals = async (labSheetId) => {
  // Get learning goals for the lab sheet
  const learningGoals = await LearningGoal.find({ labSheetId });
  
  const narrativeThemes = [
    {
      theme: "Corporate Database Infiltration",
      scenarios: [
        "Access financial records from the megacorp's secure server",
        "Retrieve employee information from the HR database",
        "Extract product data from the research division"
      ]
    },
    {
      theme: "Government Data Center",
      scenarios: [
        "Analyze classified population statistics",
        "Extract infrastructure project details",
        "Retrieve department budget allocations"
      ]
    }
  ];
  
  // Generate a mission for each learning goal
  const missions = [];
  
  for (let i = 0; i < learningGoals.length; i++) {
    const goal = learningGoals[i];
    
    // Select a random theme and scenario
    const theme = narrativeThemes[Math.floor(Math.random() * narrativeThemes.length)];
    const scenario = theme.scenarios[Math.floor(Math.random() * theme.scenarios.length)];
    
    // Generate objectives based on learning path components
    const objectives = [];
    
    // Practice objective
    if (goal.learningPath && goal.learningPath.practice) {
      objectives.push({
        title: "Primary Objective",
        description: transformToGameObjective(goal.learningPath.practice),
        targetTable: "employees",
        validationQuery: extractQueryFromContent(goal.learningPath.practice),
        xpReward: 100,
        timeLimit: 600, // 10 minutes
        hints: generateHints(goal.learningPath.practice, 3)
      });
    }
    
    // Challenge objective
    if (goal.learningPath && goal.learningPath.challenge) {
      objectives.push({
        title: "Bonus Objective",
        description: transformToGameObjective(goal.learningPath.challenge),
        targetTable: "departments",
        validationQuery: extractQueryFromContent(goal.learningPath.challenge),
        xpReward: 250,
        timeLimit: 900, // 15 minutes
        hints: generateHints(goal.learningPath.challenge, 2)
      });
    }
    
    // Create mission
    const mission = new GameMission({
      learningGoalId: goal._id,
      title: `Mission ${i+1}: ${goal.title.substring(0, 30)}...`,
      narrative: generateNarrative(theme.theme, scenario, goal.keyConcepts),
      scenarioContext: scenario,
      difficulty: getDifficultyFromGoal(goal),
      objectives,
      totalXP: objectives.reduce((sum, obj) => sum + obj.xpReward, 0),
      unlockRequirements: {
        playerLevel: i > 0 ? i : 0,
        previousMissions: i > 0 ? [missions[i-1]._id] : []
      }
    });
    
    await mission.save();
    missions.push(mission);
  }
  
  return missions;
};

/**
 * Transform learning content to game objective
 */
const transformToGameObjective = (content) => {
  // Remove markdown formatting
  let gameContent = content.replace(/^#\s+.+$/gm, "")
                           .replace(/```[a-z]*\n[\s\S]*?\n```/g, "");
  
  // Replace educational terms with game terms
  const replacements = [
    [/practice exercise/gi, "hack attempt"],
    [/write a query/gi, "extract data"],
    [/select/gi, "retrieve"],
    [/join/gi, "link"],
    [/where/gi, "filter for"],
    [/create table/gi, "construct a data container"],
    [/average|avg/gi, "mean value"],
    [/count/gi, "tally"],
    [/database/gi, "data vault"],
    [/execute/gi, "run exploit"]
  ];
  
  replacements.forEach(([pattern, replacement]) => {
    gameContent = gameContent.replace(pattern, replacement);
  });
  
  return gameContent;
};

// Helper functions
const extractQueryFromContent = (content) => {
  // Extract example SQL from content if available
  const sqlMatch = content.match(/```sql\s+([\s\S]+?)\s+```/);
  return sqlMatch ? sqlMatch[1].trim() : "";
};

const generateHints = (content, count) => {
  // Generate hints based on content
  const hints = [];
  
  // Simple extraction for now
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  for (let i = 0; i < count && i < lines.length; i++) {
    if (lines[i].match(/\w{3,}/)) {
      hints.push(lines[i]);
    }
  }
  
  return hints;
};

const generateNarrative = (theme, scenario, concepts) => {
  return `[TERMINAL ACCESS: GRANTED]
  
MISSION BRIEFING: ${theme}

Your objective: ${scenario}

You'll need to utilize your skills in ${concepts.join(', ')} to complete this mission. The security system uses Oracle database architecture. Craft your SQL queries carefully - each error creates system alerts!

Good luck, agent. The datacenter awaits.`;
};

const getDifficultyFromGoal = (goal) => {
  // Simple logic to determine difficulty
  if (goal.title.toLowerCase().includes('advanced') || 
      goal.title.toLowerCase().includes('challenge')) {
    return 'master';
  } else if (goal.learningPath && goal.learningPath.challenge) {
    return 'agent';
  } else {
    return 'rookie';
  }
};

module.exports = {
  generateMissionsFromLearningGoals
};