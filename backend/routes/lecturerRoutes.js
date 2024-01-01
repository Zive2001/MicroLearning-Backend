const express = require("express");
const multer = require("multer");
const lecturerController = require("../controllers/lecturerController");
const { protect, authorize } = require("../middlewares/auth");

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

// Protect all routes
router.use(protect);
router.use(authorize("lecturer"));

// Course management routes
router
  .route("/courses")
  .get(lecturerController.getLecturerCourses)
  .post(lecturerController.createCourse);

router
  .route("/courses/:courseId")
  .get(lecturerController.getCourse)
  .put(lecturerController.updateCourse)
  .delete(lecturerController.deleteCourse);

// Reference materials upload
router.post(
  "/courses/:courseId/upload",
  upload.array("files", 5), // Allow up to 5 files at once
  lecturerController.uploadReferenceMaterials
);

// Lecture content generation
router.post(
  "/lecture-outlines/:lectureOutlineId/generate",
  lecturerController.generateLectureContent
);

// Lecture content management
router
  .route("/lecture-content/:lectureContentId")
  .get(lecturerController.generateLectureContent)
  .put(lecturerController.generateLectureContent);

module.exports = router;
