// models/GameMission.js
const mongoose = require('mongoose');

const gameObjectiveSchema = new mongoose.Schema({
  title: String,
  description: String,
  targetTable: String,
  validationQuery: String,
  xpReward: Number,
  timeLimit: Number,
  hints: [String]
});

const gameMissionSchema = new mongoose.Schema({
  learningGoalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LearningGoal',
    required: true
  },
  title: String,
  narrative: String,
  scenarioContext: String,
  difficulty: {
    type: String,
    enum: ['rookie', 'agent', 'master', 'legendary'],
    default: 'rookie'
  },
  objectives: [gameObjectiveSchema],
  totalXP: Number,
  unlockRequirements: {
    playerLevel: Number,
    previousMissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GameMission' }]
  },
  createdAt: { type: Date, default: Date.now }
});

const GameMission = mongoose.model('GameMission', gameMissionSchema);
module.exports = GameMission;