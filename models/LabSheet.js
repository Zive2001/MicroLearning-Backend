// models/LabSheet.js
const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  subExercises: [{
    letter: String,
    description: String
  }]
});

const labSheetSchema = new mongoose.Schema({
    labNumber: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    courseCode: {
      type: String,
      default: 'Database Systems'
    },
    exercises: [exerciseSchema],
    originalText: {
      type: String,
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    concepts: [{
      type: String
    }],
    uploadDate: {
      type: Date,
      default: Date.now
    }
  });
  


const LabSheet = mongoose.model('LabSheet', labSheetSchema);

module.exports = LabSheet;