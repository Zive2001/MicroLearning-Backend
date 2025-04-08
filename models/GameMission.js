// models/GameMission.js
const mongoose = require('mongoose');

const objectiveSchema = new mongoose.Schema({
  title: String,
  description: String,
  xpReward: Number,
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
  difficulty: {
    type: String,
    enum: ['rookie', 'agent', 'master'],
    default: 'rookie'
  },
  objectives: [objectiveSchema],
  totalXP: Number,
  unlockedAt: {
    type: Date,
    default: Date.now
  }
});

const GameMission = mongoose.model('GameMission', gameMissionSchema);
module.exports = GameMission;