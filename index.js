const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./dbConfig/db");

// Initialize Express App
const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
connectDB();

// Sample Route
app.get("/", (req, res) => {
  res.send("Microlearning API is running...");
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
