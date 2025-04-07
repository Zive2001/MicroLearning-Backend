// models/LearningGoal.js
const mongoose = require('mongoose');

const learningPathSchema = new mongoose.Schema({
  concept: {
    type: String,
    required: true
  },
  example: {
    type: String,
    required: true
  },
  practice: {
    type: String,
    required: true
  },
  challenge: {
    type: String,
    required: true
  }
});

const learningGoalSchema = new mongoose.Schema({
  labSheetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabSheet',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  keyConcepts: [{
    type: String
  }],
  exercises: [{
    type: String
  }],
  prerequisites: [{
    type: String
  }],
  learningPath: {
    type: learningPathSchema,
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const LearningGoal = mongoose.model('LearningGoal', learningGoalSchema);

module.exports = LearningGoal;