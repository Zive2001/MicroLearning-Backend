// index.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const labSheetRoutes = require('./routes/labSheetRoutes');
const sqlPlaygroundRoutes = require('./routes/sqlPlaygroundRoutes');
const path = require('path');
const gameRoutes = require('./routes/gameRoutes');

// Initialize Express App
const app = express();
app.use(express.json());
app.use(cors());


// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/lab-sheets', labSheetRoutes);
app.use('/api/sql-playground', sqlPlaygroundRoutes);
app.use('/api/game', gameRoutes);

app.post('/api/test-game', (req, res) => {
  res.json({ message: 'Game route is working' });
});

app.post('/api/game/generate/:labSheetId', async (req, res) => {
  try {
    const { labSheetId } = req.params;
    const LearningGoal = require('./models/LearningGoal');
    
    // Get learning goals
    const learningGoals = await LearningGoal.find({ labSheetId });
    
    if (!learningGoals || learningGoals.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No learning goals found for this lab sheet'
      });
    }
    
    // Create simple missions
    const missions = learningGoals.map((goal, index) => ({
      id: goal._id,
      title: `Mission ${index+1}: ${goal.title}`,
      difficulty: goal.title.toLowerCase().includes('advanced') ? 'hard' : 'normal',
      xp: 100
    }));
    
    res.status(200).json({
      success: true,
      message: `${missions.length} missions generated`,
      missions
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating missions',
      error: error.message
    });
  }
});

app.get('/api/game/player', (req, res) => {
  res.json({
    success: true,
    playerProfile: {
      userId: 'anonymous',
      level: 1,
      xp: 0,
      completedMissions: []
    }
  });
});
// Sample Route
app.get("/", (req, res) => {
  res.send("Database Systems Lab Backend is running...");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});