// models/PlayerProfile.js
const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: String,
  level: Number,
  xp: Number
});

const completedMissionSchema = new mongoose.Schema({
  missionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameMission'
  },
  completedAt: Date,
  score: Number
});

const playerProfileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  level: {
    type: Number,
    default: 1
  },
  xp: {
    type: Number,
    default: 0
  },
  skills: [skillSchema],
  completedMissions: [completedMissionSchema],
  achievements: [String],
  stats: {
    queriesExecuted: Number,
    successRate: Number,
    optimizationScore: Number
  }
});

const PlayerProfile = mongoose.model('PlayerProfile', playerProfileSchema);
module.exports = PlayerProfile;