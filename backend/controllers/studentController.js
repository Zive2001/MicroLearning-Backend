const { ApiError } = require("../utils/errorHandler");
const { logger } = require("../utils/logger");
const Course = require("../models/Course");
const LectureOutlines = require("../models/LectureOutlines");
const LectureContent = require("../models/LectureContent");
const avatarService = require("../services/avatarService");
const llmService = require("../services/llmService");
const mongoose = require("mongoose");

/**
 * Controller for student-related operations
 */
const studentController = {
  /**
   * Get all courses for a student
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getStudentCourses: async (req, res, next) => {
    try {
      // Find all courses where the student is enrolled
      const courses = await Course.find({ students: req.user.id })
        .select("title code description lecturer createdAt")
        .populate("lecturer", "name")
        .sort("-createdAt");

      res.status(200).json({
        success: true,
        count: courses.length,
        data: courses,
      });
    } catch (error) {
      logger.error("Error getting student courses:", error);
      next(error);
    }
  },

  /**
   * Get a single course by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getCourse: async (req, res, next) => {
    try {
      const { courseId } = req.params;

      // Validate course ID
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return next(new ApiError("Invalid course ID", 400));
      }

      // Find the course
      const course = await Course.findById(courseId)
        .populate("lecturer", "name")
        .populate("lectureOutlines");

      if (!course) {
        return next(new ApiError("Course not found", 404));
      }

      // Check if the student is enrolled in the course
      if (!course.students.includes(req.user.id)) {
        return next(new ApiError("Unauthorized access to course", 403));
      }

      res.status(200).json({
        success: true,
        data: course,
      });
    } catch (error) {
      logger.error("Error getting course:", error);
      next(error);
    }
  },

  /**
   * Get a single lecture outline by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getLectureOutline: async (req, res, next) => {
    try {
      const { courseId, lectureOutlineId } = req.params;

      // Validate IDs
      if (
        !mongoose.Types.ObjectId.isValid(courseId) ||
        !mongoose.Types.ObjectId.isValid(lectureOutlineId)
      ) {
        return next(new ApiError("Invalid course or lecture outline ID", 400));
      }

      // Find the course
      const course = await Course.findById(courseId);

      if (!course) {
        return next(new ApiError("Course not found", 404));
      }

      // Check if the student is enrolled in the course
      if (!course.students.includes(req.user.id)) {
        return next(new ApiError("Unauthorized access to course", 403));
      }

      // Find the lecture outline
      const lectureOutline = await LectureOutlines.findById(
        lectureOutlineId
      ).populate("microLectures");

      if (!lectureOutline) {
        return next(new ApiError("Lecture outline not found", 404));
      }

      // Check if the lecture outline belongs to the course
      if (lectureOutline.course.toString() !== courseId) {
        return next(
          new ApiError("Lecture outline does not belong to the course", 400)
        );
      }

      res.status(200).json({
        success: true,
        data: lectureOutline,
      });
    } catch (error) {
      logger.error("Error getting lecture outline:", error);
      next(error);
    }
  },

  /**
   * Get a single lecture content by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getLectureContent: async (req, res, next) => {
    try {
      const { lectureContentId } = req.params;

      // Validate lecture content ID
      if (!mongoose.Types.ObjectId.isValid(lectureContentId)) {
        return next(new ApiError("Invalid lecture content ID", 400));
      }

      // Find the lecture content
      const lectureContent = await LectureContent.findById(
        lectureContentId
      ).populate({
        path: "lectureOutline",
        populate: {
          path: "course",
        },
      });

      if (!lectureContent) {
        return next(new ApiError("Lecture content not found", 404));
      }

      // Check if the student is enrolled in the course
      const course = lectureContent.lectureOutline.course;

      if (!course.students.includes(req.user.id)) {
        return next(
          new ApiError("Unauthorized access to lecture content", 403)
        );
      }

      // Increment the views count
      lectureContent.analytics.viewsCount += 1;
      await lectureContent.save();

      res.status(200).json({
        success: true,
        data: lectureContent,
      });
    } catch (error) {
      logger.error("Error getting lecture content:", error);
      next(error);
    }
  },

  /**
   * Request avatar presentation for lecture content
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  requestAvatarPresentation: async (req, res, next) => {
    try {
      const { lectureContentId } = req.params;

      // Validate lecture content ID
      if (!mongoose.Types.ObjectId.isValid(lectureContentId)) {
        return next(new ApiError("Invalid lecture content ID", 400));
      }

      // Find the lecture content
      const lectureContent = await LectureContent.findById(
        lectureContentId
      ).populate({
        path: "lectureOutline",
        populate: {
          path: "course",
        },
      });

      if (!lectureContent) {
        return next(new ApiError("Lecture content not found", 404));
      }

      // Check if the student is enrolled in the course
      const course = lectureContent.lectureOutline.course;

      if (!course.students.includes(req.user.id)) {
        return next(
          new ApiError("Unauthorized access to lecture content", 403)
        );
      }

      // Check if the lecture content has an avatar script
      if (!lectureContent.content.avatarScript) {
        return next(
          new ApiError("No avatar script available for this content", 400)
        );
      }

      // Generate avatar presentation
      const avatarPresentation = await avatarService.generateAvatarPresentation(
        lectureContent.content.avatarScript,
        "teacher",
        `lecture_${lectureContentId}.wav`
      );

      res.status(200).json({
        success: true,
        data: avatarPresentation,
      });
    } catch (error) {
      logger.error("Error requesting avatar presentation:", error);
      next(error);
    }
  },

  /**
   * Submit answer to quiz question
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  submitQuizAnswer: async (req, res, next) => {
    try {
      const { lectureContentId } = req.params;
      const { question, answer } = req.body;

      // Validate input
      if (!question || !answer) {
        return next(new ApiError("Please provide question and answer", 400));
      }

      // Validate lecture content ID
      if (!mongoose.Types.ObjectId.isValid(lectureContentId)) {
        return next(new ApiError("Invalid lecture content ID", 400));
      }

      // Find the lecture content
      const lectureContent = await LectureContent.findById(
        lectureContentId
      ).populate({
        path: "lectureOutline",
        populate: {
          path: "course",
        },
      });

      if (!lectureContent) {
        return next(new ApiError("Lecture content not found", 404));
      }

      // Check if the student is enrolled in the course
      const course = lectureContent.lectureOutline.course;

      if (!course.students.includes(req.user.id)) {
        return next(
          new ApiError("Unauthorized access to lecture content", 403)
        );
      }

      // Generate feedback on the answer
      const feedback = await llmService.generateFeedback(
        question,
        "Expected answer will be determined based on the context", // This would be from a question bank in a real system
        answer
      );

      res.status(200).json({
        success: true,
        data: feedback,
      });
    } catch (error) {
      logger.error("Error submitting quiz answer:", error);
      next(error);
    }
  },

  /**
   * Rate a lecture content
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  rateLectureContent: async (req, res, next) => {
    try {
      const { lectureContentId } = req.params;
      const { rating } = req.body;

      // Validate input
      if (!rating || rating < 1 || rating > 5) {
        return next(
          new ApiError("Please provide a valid rating between 1 and 5", 400)
        );
      }

      // Validate lecture content ID
      if (!mongoose.Types.ObjectId.isValid(lectureContentId)) {
        return next(new ApiError("Invalid lecture content ID", 400));
      }

      // Find the lecture content
      const lectureContent = await LectureContent.findById(
        lectureContentId
      ).populate({
        path: "lectureOutline",
        populate: {
          path: "course",
        },
      });

      if (!lectureContent) {
        return next(new ApiError("Lecture content not found", 404));
      }

      // Check if the student is enrolled in the course
      const course = lectureContent.lectureOutline.course;

      if (!course.students.includes(req.user.id)) {
        return next(
          new ApiError("Unauthorized access to lecture content", 403)
        );
      }

      // Update the average rating
      const currentRating = lectureContent.analytics.averageRating || 0;
      const currentRatingCount = lectureContent.analytics.viewsCount || 1; // Use views as a proxy for rating count

      // Calculate new average rating
      const newRating =
        (currentRating * currentRatingCount + rating) /
        (currentRatingCount + 1);

      // Update the lecture content
      lectureContent.analytics.averageRating = Number(newRating.toFixed(1));
      await lectureContent.save();

      res.status(200).json({
        success: true,
        data: {
          rating: lectureContent.analytics.averageRating,
        },
      });
    } catch (error) {
      logger.error("Error rating lecture content:", error);
      next(error);
    }
  },
};

module.exports = studentController;
