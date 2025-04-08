// models/PlayerProfile.js
const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  name: String,
  description: String,
  icon: String,
  dateUnlocked: Date
});

const skillSchema = new mongoose.Schema({
  name: String,
  level: Number,
  xp: Number
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
  completedMissions: [{
    missionId: { type: mongoose.Schema.Types.ObjectId, ref: 'GameMission' },
    completionDate: Date,
    score: Number,
    timeSpent: Number
  }],
  achievements: [achievementSchema],
  stats: {
    queriesExecuted: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    optimizationScore: { type: Number, default: 0 },
    fastestMission: Number,
    highestScore: Number
  },
  currentMission: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'GameMission'
  }
});

const PlayerProfile = mongoose.model('PlayerProfile', playerProfileSchema);
module.exports = PlayerProfile;