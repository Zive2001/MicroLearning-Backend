const { ApiError } = require("../utils/errorHandler");
const { logger } = require("../utils/logger");
const Course = require("../models/Course");
const LectureOutlines = require("../models/LectureOutlines");
const LectureContent = require("../models/LectureContent");
const vectorStore = require("../services/vectorStore");
const llmService = require("../services/llmService");
const cltFormatter = require("../services/cltFormatter");
const mongoose = require("mongoose");

/**
 * Controller for content management operations
 */
const contentController = {
  /**
   * Search for lecture content
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  searchContent: async (req, res, next) => {
    try {
      const { query, courseId } = req.query;

      if (!query) {
        return next(new ApiError("Please provide a search query", 400));
      }

      let courses;

      // If courseId is provided, search only in that course
      if (courseId) {
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
          return next(new ApiError("Invalid course ID", 400));
        }

        const course = await Course.findById(courseId);

        if (!course) {
          return next(new ApiError("Course not found", 404));
        }

        // Check if the user has access to the course
        if (
          req.user.role === "student" &&
          !course.students.includes(req.user.id)
        ) {
          return next(new ApiError("Unauthorized access to course", 403));
        }

        if (
          req.user.role === "lecturer" &&
          course.lecturer.toString() !== req.user.id
        ) {
          return next(new ApiError("Unauthorized access to course", 403));
        }

        courses = [course];
      } else {
        // Search across all courses the user has access to
        if (req.user.role === "student") {
          courses = await Course.find({ students: req.user.id });
        } else if (req.user.role === "lecturer") {
          courses = await Course.find({ lecturer: req.user.id });
        } else {
          courses = await Course.find({}); // Admin can access all courses
        }
      }

      // Get all lecture outlines for the courses
      const courseIds = courses.map((course) => course._id);
      const lectureOutlines = await LectureOutlines.find({
        course: { $in: courseIds },
      });

      // For each lecture outline, search in its vector store
      const searchResults = [];

      for (const outline of lectureOutlines) {
        const namespace = `lecture_${outline._id}`;

        try {
          // Perform similarity search in the vector store
          const results = await vectorStore.similaritySearch(
            query,
            namespace,
            3
          );

          if (results.length > 0) {
            // Find lecture content items that match the search results
            const lectureContent = await LectureContent.find({
              lectureOutline: outline._id,
            })
              .select("title cltPhase content.text bloomsTaxonomyLevel")
              .sort("order");

            // Find matching lecture content based on similarity to search results
            const matchingContent = [];

            for (const result of results) {
              // Find the lecture content that contains the search result text
              const matchingContentItems = lectureContent.filter((content) =>
                content.content.text.includes(result.content.substring(0, 100))
              );

              matchingContent.push(...matchingContentItems);
            }

            // Add unique matching content to search results
            const uniqueContent = [
              ...new Map(
                matchingContent.map((item) => [item._id.toString(), item])
              ).values(),
            ];

            if (uniqueContent.length > 0) {
              searchResults.push({
                lectureOutlineId: outline._id,
                title: outline.title,
                courseId: outline.course,
                matchingContent: uniqueContent.map((content) => ({
                  id: content._id,
                  title: content.title,
                  phase: content.cltPhase,
                  preview: content.content.text.substring(0, 200) + "...",
                  bloomsLevel: content.bloomsTaxonomyLevel,
                })),
              });
            }
          }
        } catch (error) {
          logger.error(`Error searching in namespace ${namespace}:`, error);
          // Continue with other lecture outlines
        }
      }

      res.status(200).json({
        success: true,
        count: searchResults.length,
        data: searchResults,
      });
    } catch (error) {
      logger.error("Error searching content:", error);
      next(error);
    }
  },

  /**
   * Generate personalized learning path
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  generateLearningPath: async (req, res, next) => {
    try {
      const { courseId, bloomsLevel } = req.body;

      // Validate course ID
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return next(new ApiError("Invalid course ID", 400));
      }

      // Validate Bloom's Taxonomy level
      const validBloomsLevels = [
        "remember",
        "understand",
        "apply",
        "analyze",
        "evaluate",
        "create",
      ];

      if (bloomsLevel && !validBloomsLevels.includes(bloomsLevel)) {
        return next(new ApiError("Invalid Bloom's Taxonomy level", 400));
      }

      // Find the course
      const course = await Course.findById(courseId);

      if (!course) {
        return next(new ApiError("Course not found", 404));
      }

      // Check if the user has access to the course
      if (
        req.user.role === "student" &&
        !course.students.includes(req.user.id)
      ) {
        return next(new ApiError("Unauthorized access to course", 403));
      }

      // Find all lecture outlines for the course
      const lectureOutlines = await LectureOutlines.find({
        course: courseId,
      }).populate("microLectures");

      // Get all lecture content for all outlines
      const allLectureContent = [];

      for (const outline of lectureOutlines) {
        const lectureContent = await LectureContent.find({
          lectureOutline: outline._id,
        }).sort("order");

        allLectureContent.push(...lectureContent);
      }

      // Filter lecture content based on Bloom's level if provided
      let filteredContent = allLectureContent;

      if (bloomsLevel) {
        // Get the index of the requested Bloom's level
        const requestedLevelIndex = validBloomsLevels.indexOf(bloomsLevel);

        // Filter content that matches or is below the requested level
        filteredContent = allLectureContent.filter((content) => {
          const contentLevelIndex = validBloomsLevels.indexOf(
            content.bloomsTaxonomyLevel
          );
          return contentLevelIndex <= requestedLevelIndex;
        });
      }

      // Group content by CLT-bLM phase and sort within each phase
      const contentByPhase = {
        prepare: filteredContent
          .filter((content) => content.cltPhase === "prepare")
          .sort((a, b) => a.order - b.order),
        initiate: filteredContent
          .filter((content) => content.cltPhase === "initiate")
          .sort((a, b) => a.order - b.order),
        deliver: filteredContent
          .filter((content) => content.cltPhase === "deliver")
          .sort((a, b) => a.order - b.order),
        end: filteredContent
          .filter((content) => content.cltPhase === "end")
          .sort((a, b) => a.order - b.order),
      };

      // Generate a learning path that follows the CLT-bLM phases
      const learningPath = [];

      // Add content from each phase in order
      for (const phase of ["prepare", "initiate", "deliver", "end"]) {
        for (const content of contentByPhase[phase]) {
          learningPath.push({
            id: content._id,
            title: content.title,
            phase: content.cltPhase,
            bloomsLevel: content.bloomsTaxonomyLevel,
            estimatedDuration: content.metadata.estimatedDuration,
            lectureOutlineId: content.lectureOutline,
          });
        }
      }

      res.status(200).json({
        success: true,
        count: learningPath.length,
        data: {
          courseId,
          courseName: course.title,
          targetBloomsLevel: bloomsLevel || "all",
          learningPath,
        },
      });
    } catch (error) {
      logger.error("Error generating learning path:", error);
      next(error);
    }
  },

  /**
   * Generate quiz for a lecture outline
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  generateQuiz: async (req, res, next) => {
    try {
      const { lectureOutlineId } = req.params;
      const { numQuestions = 5, bloomsLevel } = req.body;

      // Validate lecture outline ID
      if (!mongoose.Types.ObjectId.isValid(lectureOutlineId)) {
        return next(new ApiError("Invalid lecture outline ID", 400));
      }

      // Find the lecture outline
      const lectureOutline = await LectureOutlines.findById(lectureOutlineId)
        .populate("course")
        .populate("microLectures");

      if (!lectureOutline) {
        return next(new ApiError("Lecture outline not found", 404));
      }

      // Check if the user has access to the course
      const course = lectureOutline.course;

      if (
        req.user.role === "student" &&
        !course.students.includes(req.user.id)
      ) {
        return next(new ApiError("Unauthorized access to course", 403));
      }

      if (
        req.user.role === "lecturer" &&
        course.lecturer.toString() !== req.user.id
      ) {
        return next(new ApiError("Unauthorized access to course", 403));
      }

      // Get all lecture content text
      let lectureContentText = "";

      for (const contentId of lectureOutline.microLectures) {
        const content = await LectureContent.findById(contentId);
        if (content && content.content.text) {
          lectureContentText += content.content.text + "\n\n";
        }
      }

      // Use the specified Bloom's level or default to the highest level in the lecture
      const targetBloomsLevel =
        bloomsLevel ||
        lectureOutline.learningOutcomes.sort((a, b) => {
          const bloomsHierarchy = [
            "remember",
            "understand",
            "apply",
            "analyze",
            "evaluate",
            "create",
          ];
          return (
            bloomsHierarchy.indexOf(b.bloomsTaxonomyLevel) -
            bloomsHierarchy.indexOf(a.bloomsTaxonomyLevel)
          );
        })[0]?.bloomsTaxonomyLevel ||
        "understand";

      // Generate quiz questions
      const quizQuestions = await llmService.generateQuizQuestions(
        lectureContentText,
        targetBloomsLevel,
        numQuestions
      );

      res.status(200).json({
        success: true,
        data: {
          lectureOutlineId,
          title: lectureOutline.title,
          bloomsLevel: targetBloomsLevel,
          questions: quizQuestions,
        },
      });
    } catch (error) {
      logger.error("Error generating quiz:", error);
      next(error);
    }
  },

  /**
   * Get analytics for a course
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getCourseAnalytics: async (req, res, next) => {
    try {
      const { courseId } = req.params;

      // Validate course ID
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return next(new ApiError("Invalid course ID", 400));
      }

      // Find the course
      const course = await Course.findById(courseId);

      if (!course) {
        return next(new ApiError("Course not found", 404));
      }

      // Check if the lecturer owns the course
      if (
        req.user.role === "lecturer" &&
        course.lecturer.toString() !== req.user.id
      ) {
        return next(new ApiError("Unauthorized access to course", 403));
      }

      // Find all lecture outlines for the course
      const lectureOutlines = await LectureOutlines.find({ course: courseId });

      // Gather analytics for each lecture outline
      const outlineAnalytics = [];

      for (const outline of lectureOutlines) {
        // Find all lecture content for the outline
        const lectureContent = await LectureContent.find({
          lectureOutline: outline._id,
        });

        // Calculate analytics
        const totalViews = lectureContent.reduce(
          (sum, content) => sum + (content.analytics.viewsCount || 0),
          0
        );
        const averageRating =
          lectureContent.reduce(
            (sum, content) => sum + (content.analytics.averageRating || 0),
            0
          ) /
          (lectureContent.filter(
            (content) => content.analytics.averageRating > 0
          ).length || 1);

        outlineAnalytics.push({
          lectureOutlineId: outline._id,
          title: outline.title,
          contentCount: lectureContent.length,
          totalViews,
          averageRating: Number(averageRating.toFixed(1)),
          learningOutcomes: outline.learningOutcomes.length,
        });
      }

      res.status(200).json({
        success: true,
        data: {
          courseId,
          title: course.title,
          studentCount: course.students.length,
          outlineCount: lectureOutlines.length,
          outlineAnalytics,
        },
      });
    } catch (error) {
      logger.error("Error getting course analytics:", error);
      next(error);
    }
  },
};

module.exports = contentController;
