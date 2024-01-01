const mongoose = require("mongoose");

const LectureContentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a micro lecture title"],
      trim: true,
      maxlength: [
        100,
        "Micro lecture title cannot be more than 100 characters",
      ],
    },
    lectureOutline: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LectureOutlines",
      required: true,
    },
    // CLT-bLM phases
    cltPhase: {
      type: String,
      enum: ["prepare", "initiate", "deliver", "end"],
      required: true,
    },
    contentType: {
      type: String,
      enum: ["text", "video", "audio", "interactive"],
      default: "text",
    },
    content: {
      text: String,
      mediaUrl: String,
      avatarScript: String,
    },
    // Bloom's Taxonomy level
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
    metadata: {
      estimatedDuration: Number, // in seconds
      generatedDate: {
        type: Date,
        default: Date.now,
      },
      vectorEmbeddingId: String,
    },
    // Analytics data
    analytics: {
      viewsCount: {
        type: Number,
        default: 0,
      },
      averageCompletionRate: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
      },
      engagementScore: {
        type: Number,
        default: 0,
      },
    },
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

module.exports = mongoose.model("LectureContent", LectureContentSchema);
