const express = require("express");
const studentController = require("../controllers/studentController");
const { protect, authorize } = require("../middlewares/auth");

const router = express.Router();

// Protect all routes
router.use(protect);
router.use(authorize("student"));

// Course access routes
router.get("/courses", studentController.getStudentCourses);
router.get("/courses/:courseId", studentController.getCourse);

// Lecture outline access
router.get(
  "/courses/:courseId/lecture-outlines/:lectureOutlineId",
  studentController.getLectureOutline
);

// Lecture content access and interaction
router.get(
  "/lecture-content/:lectureContentId",
  studentController.getLectureContent
);

router.post(
  "/lecture-content/:lectureContentId/avatar",
  studentController.requestAvatarPresentation
);

router.post(
  "/lecture-content/:lectureContentId/quiz",
  studentController.submitQuizAnswer
);

router.post(
  "/lecture-content/:lectureContentId/rate",
  studentController.rateLectureContent
);

module.exports = router;
