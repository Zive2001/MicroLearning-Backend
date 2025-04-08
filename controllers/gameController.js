// controllers/gameController.js
const GameMission = require('../models/GameMission');
const PlayerProfile = require('../models/PlayerProfile');
const { executeQuery } = require('../services/sql-execution');
const { generateMissionsFromLearningGoals } = require('../services/mission-generator');

/**
 * Generate missions for a lab sheet
 */
const generateMissions = async (req, res) => {
  try {
    const { labSheetId } = req.params;
    
    // Generate missions
    const missions = await generateMissionsFromLearningGoals(labSheetId);
    
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
 * Get mission details
 */
const getMissionDetails = async (req, res) => {
  try {
    const { missionId } = req.params;
    const userId = req.userId || 'anonymous';
    
    // Get mission
    const mission = await GameMission.findById(missionId);
    
    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission not found'
      });
    }
    
    // Get or create player profile
    let playerProfile = await PlayerProfile.findOne({ userId });
    
    if (!playerProfile) {
      playerProfile = new PlayerProfile({ userId });
      await playerProfile.save();
    }
    
    // Update current mission
    playerProfile.currentMission = mission._id;
    await playerProfile.save();
    
    // Return mission details with first objective
    res.status(200).json({
      success: true,
      mission: {
        id: mission._id,
        title: mission.title,
        narrative: mission.narrative,
        difficulty: mission.difficulty,
        currentObjective: mission.objectives[0]
      },
      player: {
        level: playerProfile.level,
        xp: playerProfile.xp,
        stats: playerProfile.stats
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
 * Execute a query in game mode
 */
const executeMissionQuery = async (req, res) => {
  try {
    const { missionId, objectiveIndex = 0 } = req.params;
    const { query } = req.body;
    const userId = req.userId || 'anonymous';
    const sessionId = `${userId}_${Date.now()}`;
    
    // Get mission and objective
    const mission = await GameMission.findById(missionId);
    
    if (!mission || !mission.objectives[objectiveIndex]) {
      return res.status(404).json({
        success: false,
        message: 'Mission or objective not found'
      });
    }
    
    const objective = mission.objectives[objectiveIndex];
    
    // Execute query
    const result = await executeQuery(query, {}, sessionId);
    
    // Get player profile
    let playerProfile = await PlayerProfile.findOne({ userId });
    
    if (!playerProfile) {
      playerProfile = new PlayerProfile({ userId });
    }
    
    // Update stats
    playerProfile.stats.queriesExecuted++;
    
    // Check for mission success
    let missionSuccess = false;
    let gainedXP = 0;
    let feedback = '';
    
    if (result.success) {
      // Simple success check - in reality would need more sophisticated validation
      missionSuccess = true;
      gainedXP = objective.xpReward;
      feedback = "Mission accomplished! Data extraction successful.";
      
      // Update player profile
      playerProfile.xp += gainedXP;
      playerProfile.stats.successRate = (playerProfile.stats.successRate * (playerProfile.stats.queriesExecuted - 1) + 100) / playerProfile.stats.queriesExecuted;
      
      // Check for level up
      if (playerProfile.xp >= playerProfile.level * 1000) {
        playerProfile.level++;
        feedback += ` LEVEL UP! You are now level ${playerProfile.level}!`;
      }
      
      // Mark mission as completed if this was the last objective
      if (objectiveIndex === mission.objectives.length - 1) {
        playerProfile.completedMissions.push({
          missionId: mission._id,
          completionDate: new Date(),
          score: gainedXP,
          timeSpent: 0 // Would calculate from mission start time
        });
      }
    } else {
      feedback = "Access denied! Your query caused a security alert. Try a different approach.";
      playerProfile.stats.successRate = (playerProfile.stats.successRate * (playerProfile.stats.queriesExecuted - 1)) / playerProfile.stats.queriesExecuted;
    }
    
    await playerProfile.save();
    
    // Game-themed response
    res.status(200).json({
      terminalOutput: {
        success: result.success,
        message: feedback,
        xpGained: gainedXP,
        securityLevel: result.success ? "BYPASSED" : "ALERTED",
        results: result.results,
        errors: !result.success ? [{
          code: "SECURITY_BREACH",
          message: result.error,
          trace: "FIREWALL_BLOCKED"
        }] : []
      },
      playerStatus: {
        level: playerProfile.level,
        xp: playerProfile.xp,
        nextLevelAt: playerProfile.level * 1000
      },
      missionStatus: {
        completed: missionSuccess,
        nextObjective: missionSuccess && objectiveIndex < mission.objectives.length - 1 ? 
          mission.objectives[objectiveIndex + 1] : null
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
 * Get player profile and progress
 */
const getPlayerProfile = async (req, res) => {
  try {
    const userId = req.userId || 'anonymous';
    
    // Get player profile
    let playerProfile = await PlayerProfile.findOne({ userId })
                                         .populate('completedMissions.missionId')
                                         .populate('currentMission');
    
    if (!playerProfile) {
      playerProfile = new PlayerProfile({ userId });
      await playerProfile.save();
      
      // Re-fetch with populated fields
      playerProfile = await PlayerProfile.findOne({ userId });
    }
    
    res.status(200).json({
      success: true,
      playerProfile: {
        level: playerProfile.level,
        xp: playerProfile.xp,
        nextLevelAt: playerProfile.level * 1000,
        skills: playerProfile.skills,
        stats: playerProfile.stats,
        achievements: playerProfile.achievements,
        completedMissions: playerProfile.completedMissions.map(cm => ({
          mission: {
            id: cm.missionId ? cm.missionId._id : null,
            title: cm.missionId ? cm.missionId.title : 'Unknown mission'
          },
          completionDate: cm.completionDate,
          score: cm.score
        })),
        currentMission: playerProfile.currentMission ? {
          id: playerProfile.currentMission._id,
          title: playerProfile.currentMission.title,
          difficulty: playerProfile.currentMission.difficulty
        } : null
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