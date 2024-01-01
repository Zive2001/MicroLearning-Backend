const mongoose = require("mongoose");

const CourseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a course title"],
      trim: true,
      maxlength: [100, "Course title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    code: {
      type: String,
      required: [true, "Please add a course code"],
      unique: true,
      trim: true,
    },
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lectureOutlines: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LectureOutlines",
      },
    ],
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

// Virtual field for student count
CourseSchema.virtual("studentCount").get(function () {
  return this.students ? this.students.length : 0;
});

// Virtual field for lecture outline count
CourseSchema.virtual("lectureCount").get(function () {
  return this.lectureOutlines ? this.lectureOutlines.length : 0;
});

module.exports = mongoose.model("Course", CourseSchema);
