// models/QueryAttempt.js
const mongoose = require('mongoose');

const queryAttemptSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LearningGoal',
    required: true
  },
  query: {
    type: String,
    required: true
  },
  isSuccessful: {
    type: Boolean,
    default: false
  },
  isChallenge: {
    type: Boolean,
    default: false
  },
  executionTime: {
    type: Number
  },
  error: {
    type: String
  },
  feedback: {
    type: String
  },
  points: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const QueryAttempt = mongoose.model('QueryAttempt', queryAttemptSchema);

module.exports = QueryAttempt;