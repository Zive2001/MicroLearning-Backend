const mongoose = require("mongoose");

const LectureOutlinesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a lecture title"],
      trim: true,
      maxlength: [100, "Lecture title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    learningOutcomes: [
      {
        description: {
          type: String,
          required: true,
        },
        bloomsTaxonomyLevel: {
          type: String,
          enum: [
            "remember",
            "understand",
            "apply",
            "analyze",
            "evaluate",
            "create",
          ],
          required: true,
        },
      },
    ],
    referenceResources: [
      {
        title: String,
        blobStoragePath: String,
        fileType: String,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    microLectures: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LectureContent",
      },
    ],
    order: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model("LectureOutlines", LectureOutlinesSchema);
