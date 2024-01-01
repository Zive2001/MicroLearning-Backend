const express = require("express");
const contentController = require("../controllers/contentController");
const { protect } = require("../middlewares/auth");

const router = express.Router();

// Protect all routes
router.use(protect);

// Search content
router.get("/search", contentController.searchContent);

// Generate learning path
router.post("/learning-path", contentController.generateLearningPath);

// Generate quiz
router.post(
  "/lecture-outlines/:lectureOutlineId/quiz",
  contentController.generateQuiz
);

// Course analytics (lecturer only)
router.get(
  "/courses/:courseId/analytics",
  contentController.getCourseAnalytics
);

module.exports = router;
