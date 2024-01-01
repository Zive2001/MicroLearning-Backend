const { body, param, query, validationResult } = require("express-validator");
const { ApiError } = require("../utils/errorHandler");
const config = require("../config/env");

/**
 * Process validation errors from express-validator
 */
const processValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new ApiError(errors.array()[0].msg, 400));
  }

  next();
};

/**
 * Validators for course operations
 */
const courseValidators = {
  createCourse: [
    body("title")
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ max: 100 })
      .withMessage("Title cannot exceed 100 characters"),
    body("description")
      .notEmpty()
      .withMessage("Description is required")
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
    body("code")
      .notEmpty()
      .withMessage("Course code is required")
      .isLength({ max: 20 })
      .withMessage("Course code cannot exceed 20 characters"),
    processValidationErrors,
  ],

  updateCourse: [
    param("courseId").isMongoId().withMessage("Invalid course ID"),
    body("title")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Title cannot exceed 100 characters"),
    body("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
    body("code")
      .optional()
      .isLength({ max: 20 })
      .withMessage("Course code cannot exceed 20 characters"),
    processValidationErrors,
  ],

  getCourse: [
    param("courseId").isMongoId().withMessage("Invalid course ID"),
    processValidationErrors,
  ],

  deleteCourse: [
    param("courseId").isMongoId().withMessage("Invalid course ID"),
    processValidationErrors,
  ],
};

/**
 * Validators for lecture operations
 */
const lectureValidators = {
  generateLectureContent: [
    param("lectureOutlineId")
      .isMongoId()
      .withMessage("Invalid lecture outline ID"),
    processValidationErrors,
  ],

  getLectureContent: [
    param("lectureContentId")
      .isMongoId()
      .withMessage("Invalid lecture content ID"),
    processValidationErrors,
  ],

  updateLectureContent: [
    param("lectureContentId")
      .isMongoId()
      .withMessage("Invalid lecture content ID"),
    body("title")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Title cannot exceed 100 characters"),
    body("content.text").optional(),
    body("content.avatarScript").optional(),
    processValidationErrors,
  ],

  uploadReferenceMaterials: [
    param("courseId").isMongoId().withMessage("Invalid course ID"),
    processValidationErrors,
  ],
};

/**
 * Validators for student operations
 */
const studentValidators = {
  submitQuizAnswer: [
    param("lectureContentId")
      .isMongoId()
      .withMessage("Invalid lecture content ID"),
    body("question").notEmpty().withMessage("Question is required"),
    body("answer").notEmpty().withMessage("Answer is required"),
    processValidationErrors,
  ],

  rateLectureContent: [
    param("lectureContentId")
      .isMongoId()
      .withMessage("Invalid lecture content ID"),
    body("rating")
      .notEmpty()
      .withMessage("Rating is required")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    processValidationErrors,
  ],

  requestAvatarPresentation: [
    param("lectureContentId")
      .isMongoId()
      .withMessage("Invalid lecture content ID"),
    processValidationErrors,
  ],
};

/**
 * Validators for content operations
 */
const contentValidators = {
  searchContent: [
    query("query").notEmpty().withMessage("Search query is required"),
    query("courseId").optional().isMongoId().withMessage("Invalid course ID"),
    processValidationErrors,
  ],

  generateLearningPath: [
    body("courseId").isMongoId().withMessage("Invalid course ID"),
    body("bloomsLevel")
      .optional()
      .isIn([
        "remember",
        "understand",
        "apply",
        "analyze",
        "evaluate",
        "create",
      ])
      .withMessage("Invalid Bloom's Taxonomy level"),
    processValidationErrors,
  ],

  generateQuiz: [
    param("lectureOutlineId")
      .isMongoId()
      .withMessage("Invalid lecture outline ID"),
    body("numQuestions")
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage("Number of questions must be between 1 and 10"),
    body("bloomsLevel")
      .optional()
      .isIn([
        "remember",
        "understand",
        "apply",
        "analyze",
        "evaluate",
        "create",
      ])
      .withMessage("Invalid Bloom's Taxonomy level"),
    processValidationErrors,
  ],

  getCourseAnalytics: [
    param("courseId").isMongoId().withMessage("Invalid course ID"),
    processValidationErrors,
  ],
};

/**
 * Validators for authentication operations
 */
const authValidators = {
  register: [
    body("name")
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2 and 50 characters"),
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format"),
    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("role")
      .optional()
      .isIn(["student", "lecturer", "admin"])
      .withMessage("Invalid role"),
    processValidationErrors,
  ],

  login: [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email format"),
    body("password").notEmpty().withMessage("Password is required"),
    processValidationErrors,
  ],
};

module.exports = {
  courseValidators,
  lectureValidators,
  studentValidators,
  contentValidators,
  authValidators,
  processValidationErrors,
};
