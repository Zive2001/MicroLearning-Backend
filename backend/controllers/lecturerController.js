const { ApiError } = require("../utils/errorHandler");
const { logger } = require("../utils/logger");
const Course = require("../models/Course");
const LectureOutlines = require("../models/LectureOutlines");
const LectureContent = require("../models/LectureContent");
const pdfExtractor = require("../services/pdfExtractor");
const vectorStore = require("../services/vectorStore");
const cltFormatter = require("../services/cltFormatter");
const mongoose = require("mongoose");

/**
 * Controller for lecturer-related operations
 */
const lecturerController = {
  /**
   * Upload reference materials for a course
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  uploadReferenceMaterials: async (req, res, next) => {
    try {
      // Check if files were uploaded
      if (!req.files || !req.files.length) {
        return next(new ApiError("No files were uploaded", 400));
      }

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
      if (course.lecturer.toString() !== req.user.id) {
        return next(new ApiError("Unauthorized access to course", 403));
      }

      // Process each uploaded file
      const uploadResults = [];

      for (const file of req.files) {
        // Extract text from the PDF
        const pdfText = await pdfExtractor.extractTextFromBuffer(file.buffer);

        // Extract lecture outlines and learning outcomes
        const { learningOutcomes, courseDescription } =
          pdfExtractor.extractLectureOutlinesAndOutcomes(pdfText);

        // Upload the file to Azure Blob Storage
        const blobUrl = await pdfExtractor.uploadToStorage(
          file.buffer,
          file.originalname
        );

        // Update the course with reference materials
        const lectureOutline = await LectureOutlines.create({
          title: file.originalname.replace(".pdf", ""),
          description: courseDescription.substring(0, 500), // Limit to 500 chars
          course: courseId,
          lecturer: req.user.id,
          learningOutcomes,
          referenceResources: [
            {
              title: file.originalname,
              blobStoragePath: blobUrl,
              fileType: file.mimetype,
            },
          ],
        });

        // Add the lecture outline to the course
        course.lectureOutlines.push(lectureOutline._id);

        // Split the text into chunks for vector storage
        const chunks = pdfExtractor.splitIntoChunks(pdfText);

        // Create a vector store namespace for this lecture
        const namespace = `lecture_${lectureOutline._id}`;

        // Store the chunks in vector storage
        await vectorStore.createVectorStore(chunks, namespace);

        uploadResults.push({
          filename: file.originalname,
          id: lectureOutline._id,
          learningOutcomes: learningOutcomes.length,
          chunks: chunks.length,
        });
      }

      // Save the updated course
      await course.save();

      res.status(200).json({
        success: true,
        data: uploadResults,
      });
    } catch (error) {
      logger.error("Error uploading reference materials:", error);
      next(error);
    }
  },

  /**
   * Generate lecture content
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  generateLectureContent: async (req, res, next) => {
    try {
      const { lectureOutlineId } = req.params;

      // Validate lecture outline ID
      if (!mongoose.Types.ObjectId.isValid(lectureOutlineId)) {
        return next(new ApiError("Invalid lecture outline ID", 400));
      }

      // Find the lecture outline
      const lectureOutline = await LectureOutlines.findById(
        lectureOutlineId
      ).populate("course");

      if (!lectureOutline) {
        return next(new ApiError("Lecture outline not found", 404));
      }

      // Check if the lecturer owns the course
      if (lectureOutline.lecturer.toString() !== req.user.id) {
        return next(
          new ApiError("Unauthorized access to lecture outline", 403)
        );
      }

      // Get reference materials
      const referenceResource = lectureOutline.referenceResources[0];

      if (!referenceResource) {
        return next(
          new ApiError(
            "No reference materials found for this lecture outline",
            404
          )
        );
      }

      // Download the reference material from Blob Storage
      const pdfBuffer = await pdfExtractor.downloadFromStorage(
        referenceResource.blobStoragePath
      );

      // Extract text from the PDF
      const pdfText = await pdfExtractor.extractTextFromBuffer(pdfBuffer);

      // Generate learning materials
      const learningMaterials = await cltFormatter.generateLearningMaterials(
        lectureOutline.title,
        lectureOutline.learningOutcomes,
        pdfText
      );

      // Create lecture content entries for each microlearning chunk
      const createdContent = [];

      for (const chunk of learningMaterials.microlearningChunks) {
        // Determine Bloom's level for this chunk based on matched learning outcomes
        const bloomsLevel =
          lectureOutline.learningOutcomes[0]?.bloomsTaxonomyLevel ||
          "understand";

        // Create the lecture content
        const lectureContent = await LectureContent.create({
          title: `${lectureOutline.title} - ${
            chunk.phase.charAt(0).toUpperCase() + chunk.phase.slice(1)
          } ${chunk.order}`,
          lectureOutline: lectureOutlineId,
          cltPhase: chunk.phase,
          content: {
            text: chunk.content,
            avatarScript: learningMaterials.avatarScripts[chunk.phase],
          },
          bloomsTaxonomyLevel: bloomsLevel,
          metadata: {
            estimatedDuration: chunk.content.length / 20, // Rough estimate: 20 chars per second
            vectorEmbeddingId: `${lectureOutlineId}_${chunk.phase}_${chunk.order}`,
          },
          order: chunk.order,
        });

        // Add the lecture content to the lecture outline's microLectures array
        lectureOutline.microLectures.push(lectureContent._id);

        createdContent.push({
          id: lectureContent._id,
          title: lectureContent.title,
          phase: chunk.phase,
          order: chunk.order,
        });
      }

      // Save the updated lecture outline
      await lectureOutline.save();

      res.status(200).json({
        success: true,
        data: {
          lectureOutlineId,
          title: lectureOutline.title,
          phases: Object.keys(learningMaterials.phaseContent),
          contentCount: createdContent.length,
          content: createdContent,
        },
      });
    } catch (error) {
      logger.error("Error generating lecture content:", error);
      next(error);
    }
  },

  /**
   * Get all courses for a lecturer
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getLecturerCourses: async (req, res, next) => {
    try {
      // Find all courses where the lecturer is the user
      const courses = await Course.find({ lecturer: req.user.id })
        .select("title code description lectureOutlines students createdAt")
        .sort("-createdAt");

      res.status(200).json({
        success: true,
        count: courses.length,
        data: courses,
      });
    } catch (error) {
      logger.error("Error getting lecturer courses:", error);
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
        .populate("lectureOutlines")
        .populate("students", "name email");

      if (!course) {
        return next(new ApiError("Course not found", 404));
      }

      // Check if the lecturer owns the course
      if (course.lecturer.toString() !== req.user.id) {
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
   * Create a new course
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  createCourse: async (req, res, next) => {
    try {
      // Validate required fields
      const { title, description, code } = req.body;

      if (!title || !description || !code) {
        return next(
          new ApiError("Please provide title, description, and code", 400)
        );
      }

      // Create the course
      const course = await Course.create({
        title,
        description,
        code,
        lecturer: req.user.id,
      });

      res.status(201).json({
        success: true,
        data: course,
      });
    } catch (error) {
      logger.error("Error creating course:", error);

      // Check for duplicate course code
      if (error.code === 11000) {
        return next(new ApiError("Course with this code already exists", 400));
      }

      next(error);
    }
  },

  /**
   * Update a course
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  updateCourse: async (req, res, next) => {
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
      if (course.lecturer.toString() !== req.user.id) {
        return next(new ApiError("Unauthorized access to course", 403));
      }

      // Update the course
      const updatedCourse = await Course.findByIdAndUpdate(courseId, req.body, {
        new: true,
        runValidators: true,
      });

      res.status(200).json({
        success: true,
        data: updatedCourse,
      });
    } catch (error) {
      logger.error("Error updating course:", error);

      // Check for duplicate course code
      if (error.code === 11000) {
        return next(new ApiError("Course with this code already exists", 400));
      }

      next(error);
    }
  },

  /**
   * Delete a course
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  deleteCourse: async (req, res, next) => {
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
      if (course.lecturer.toString() !== req.user.id) {
        return next(new ApiError("Unauthorized access to course", 403));
      }

      // Delete the course (this will not cascade delete related resources)
      await course.remove();

      res.status(200).json({
        success: true,
        data: {},
      });
    } catch (error) {
      logger.error("Error deleting course:", error);
      next(error);
    }
  },
};

/**
 * Get lecture content details
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

    // Check if the lecturer owns the course
    if (lectureContent.lectureOutline.lecturer.toString() !== req.user.id) {
      return next(new ApiError("Unauthorized access to lecture content", 403));
    }

    res.status(200).json({
      success: true,
      data: lectureContent,
    });
  } catch (error) {
    logger.error("Error getting lecture content:", error);
    next(error);
  }
};

/**
 * Update lecture content
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
updateLectureContent: async (req, res, next) => {
  try {
    const { lectureContentId } = req.params;

    // Validate lecture content ID
    if (!mongoose.Types.ObjectId.isValid(lectureContentId)) {
      return next(new ApiError("Invalid lecture content ID", 400));
    }

    // Find the lecture content
    const lectureContent = await LectureContent.findById(
      lectureContentId
    ).populate("lectureOutline");

    if (!lectureContent) {
      return next(new ApiError("Lecture content not found", 404));
    }

    // Check if the lecturer owns the lecture outline
    if (lectureContent.lectureOutline.lecturer.toString() !== req.user.id) {
      return next(new ApiError("Unauthorized access to lecture content", 403));
    }

    // Update the lecture content
    const updatedLectureContent = await LectureContent.findByIdAndUpdate(
      lectureContentId,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: updatedLectureContent,
    });
  } catch (error) {
    logger.error("Error updating lecture content:", error);
    next(error);
  }
};

module.exports = lecturerController;
