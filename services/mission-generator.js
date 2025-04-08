// services/mission-generator.js
const GameMission = require('../models/GameMission');
const LearningGoal = require('../models/LearningGoal');

/**
 * Generate game missions from learning goals
 * @param {string} labSheetId - ID of the lab sheet
 * @returns {Promise<Array>} - Generated missions
 */
const generateMissionsFromLearningGoals = async (labSheetId) => {
  try {
    // Get learning goals for the lab sheet
    const learningGoals = await LearningGoal.find({ labSheetId });
    
    if (!learningGoals || learningGoals.length === 0) {
      console.log(`No learning goals found for lab sheet ${labSheetId}`);
      return [];
    }
    
    // Generate missions for each learning goal
    const missions = [];
    
    for (let i = 0; i < learningGoals.length; i++) {
      const goal = learningGoals[i];
      
      // Check if mission already exists
      const existingMission = await GameMission.findOne({ learningGoalId: goal._id });
      
      if (existingMission) {
        missions.push(existingMission);
        continue;
      }
      
      // Create mission
      const mission = new GameMission({
        learningGoalId: goal._id,
        title: `Mission ${i+1}: ${goal.title.substring(0, 30)}...`,
        narrative: generateMissionNarrative(goal),
        difficulty: getDifficultyFromGoal(goal),
        objectives: generateObjectives(goal),
        totalXP: 350, // Default XP value
        unlockedAt: Date.now()
      });
      
      await mission.save();
      missions.push(mission);
    }
    
    return missions;
  } catch (error) {
    console.error('Error generating missions:', error);
    return [];
  }
};

/**
 * Generate a mission narrative
 */
const generateMissionNarrative = (goal) => {
  const concepts = goal.keyConcepts.join(', ');
  return `[TERMINAL ACCESS: GRANTED]
  
MISSION BRIEF: SYNTAX Corp Security Breach
  
Your objective: Infiltrate the database system using ${concepts}.
  
The system uses Oracle database architecture. Craft your SQL queries carefully - each error creates system alerts!
  
Good luck, agent. The data center awaits.`;
};

/**
 * Get difficulty from goal type
 */
const getDifficultyFromGoal = (goal) => {
  const title = goal.title.toLowerCase();
  if (title.includes('advanced')) return 'master';
  if (title.includes('query')) return 'agent';
  return 'rookie';
};

/**
 * Generate objectives from learning goal
 */
const generateObjectives = (goal) => {
  const objectives = [];
  
  if (goal.learningPath && goal.learningPath.practice) {
    objectives.push({
      title: "Primary Objective",
      description: goal.learningPath.practice.replace(/#|Practice Exercise|Hint:.+$/g, '').trim(),
      xpReward: 150,
      hints: ["Try using the example from the learning materials", "Focus on the syntax"]
    });
  }
  
  if (goal.learningPath && goal.learningPath.challenge) {
    objectives.push({
      title: "Bonus Objective",
      description: goal.learningPath.challenge.replace(/#|Challenge|This will test.+$/g, '').trim(),
      xpReward: 200,
      hints: ["This is more advanced", "Think about how to extend the basic solution"]
    });
  }
  
  // Ensure we have at least one objective
  if (objectives.length === 0) {
    objectives.push({
      title: "Database Objective",
      description: "Complete the tasks related to this learning goal.",
      xpReward: 100,
      hints: ["Review the examples in the learning materials"]
    });
  }
  
  return objectives;
};

module.exports = {
  generateMissionsFromLearningGoals
};