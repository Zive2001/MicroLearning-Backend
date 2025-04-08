// controllers/gameController.js
const GameMission = require('../models/GameMission');
const PlayerProfile = require('../models/PlayerProfile');
const LearningGoal = require('../models/LearningGoal');
const { executeQuery } = require('../services/sql-execution');

/**
 * Generate missions for a lab sheet
 */
const generateMissions = async (req, res) => {
  try {
    const { labSheetId } = req.params;
    
    // Get learning goals
    const learningGoals = await LearningGoal.find({ labSheetId });
    
    if (!learningGoals || learningGoals.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No learning goals found for this lab sheet'
      });
    }
    
    // Clear any existing missions for this lab sheet
    await GameMission.deleteMany({
      learningGoalId: { $in: learningGoals.map(goal => goal._id) }
    });
    
    // Generate missions for each learning goal
    const missions = [];
    
    for (let i = 0; i < learningGoals.length; i++) {
      const goal = learningGoals[i];
      
      // Create mission with basic info
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
    
    res.status(200).json({
      success: true,
      message: `${missions.length} missions generated successfully`,
      missions: missions.map(m => ({
        id: m._id,
        title: m.title,
        difficulty: m.difficulty,
        totalXP: m.totalXP
      }))
    });
  } catch (error) {
    console.error('Error generating missions:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating missions',
      error: error.message
    });
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

/**
 * Get mission details
 */
const getMissionDetails = async (req, res) => {
  try {
    const { missionId } = req.params;
    
    // Get mission
    const mission = await GameMission.findById(missionId);
    
    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission not found'
      });
    }
    
    // Get learning goal
    const learningGoal = await LearningGoal.findById(mission.learningGoalId);
    
    if (!learningGoal) {
      return res.status(404).json({
        success: false,
        message: 'Learning goal not found'
      });
    }
    
    res.status(200).json({
      success: true,
      mission: {
        id: mission._id,
        title: mission.title,
        narrative: mission.narrative,
        difficulty: mission.difficulty,
        objectives: mission.objectives,
        totalXP: mission.totalXP
      },
      learningGoal: {
        id: learningGoal._id,
        title: learningGoal.title,
        keyConcepts: learningGoal.keyConcepts
      }
    });
  } catch (error) {
    console.error('Error getting mission details:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting mission details',
      error: error.message
    });
  }
};

/**
 * Execute a query in mission mode
 */
const executeMissionQuery = async (req, res) => {
  try {
    const { missionId, objectiveIndex = 0 } = req.params;
    const { query } = req.body;
    const userId = req.userId || 'anonymous';
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'No query provided'
      });
    }
    
    // Get mission
    const mission = await GameMission.findById(missionId);
    
    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission not found'
      });
    }
    
    // Execute the query
    const result = await executeQuery(query);
    
    // Create a themed response
    res.status(200).json({
      terminalOutput: {
        success: result.success,
        message: result.success ? 
          "ACCESS GRANTED: Query executed successfully." : 
          "ACCESS DENIED: Security system detected an error.",
        xpGained: result.success ? mission.objectives[objectiveIndex]?.xpReward || 100 : 0,
        securityLevel: result.success ? "BYPASSED" : "ALERTED",
        results: result.results,
        errors: result.success ? [] : [{
          code: "SECURITY_BREACH",
          message: result.error || "Unknown error",
          trace: "FIREWALL_BLOCKED"
        }]
      },
      missionStatus: {
        completed: result.success,
        nextObjective: result.success && parseInt(objectiveIndex) < mission.objectives.length - 1 ? 
          parseInt(objectiveIndex) + 1 : null
      }
    });
  } catch (error) {
    console.error('Error executing mission query:', error);
    res.status(500).json({
      terminalOutput: {
        success: false,
        message: "CRITICAL ERROR: Connection to data center lost",
        errors: [{
          code: "SYSTEM_FAILURE",
          message: error.message,
          trace: "CONNECTION_TERMINATED"
        }]
      }
    });
  }
};

/**
 * Get player profile
 */
const getPlayerProfile = async (req, res) => {
  try {
    const userId = req.userId || 'anonymous';
    
    // Find or create player profile
    let playerProfile = await PlayerProfile.findOne({ userId });
    
    if (!playerProfile) {
      playerProfile = new PlayerProfile({
        userId,
        level: 1,
        xp: 0,
        skills: [{ name: "SQL", level: 1, xp: 0 }],
        completedMissions: [],
        achievements: [],
        stats: {
          queriesExecuted: 0,
          successRate: 0,
          optimizationScore: 0
        }
      });
      
      await playerProfile.save();
    }
    
    res.status(200).json({
      success: true,
      playerProfile: {
        level: playerProfile.level,
        xp: playerProfile.xp,
        skills: playerProfile.skills,
        stats: playerProfile.stats,
        completedMissions: playerProfile.completedMissions
      }
    });
  } catch (error) {
    console.error('Error getting player profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting player profile',
      error: error.message
    });
  }
};

module.exports = {
  generateMissions,
  getMissionDetails,
  executeMissionQuery,
  getPlayerProfile
};