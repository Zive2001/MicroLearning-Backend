const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const labSheetRoutes = require('./routes/labSheetRoutes');
const path = require('path');

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