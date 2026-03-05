const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true, // Added index for faster lookups by user
    },
    authorName: {
      type: String,
      required: true,
      trim: true, // Removes accidental spaces like " John Doe "
    },
    title: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    // CHANGED: Increased length for better AI analysis
    desc: {
      type: String,
      maxlength: 5000, // Increased from 500. 500 is too short for good TF-IDF analysis.
      default: "", // Default to empty string to prevent crashes if missing
    },
    // NEW FIELD: Critical for the 'Genre Score' in your hybrid algorithm
    genres: [
      {
        type: String,
        lowercase: true, // Forces "Fantasy" -> "fantasy" for easier matching
        trim: true,
      },
    ],
    cover: {
      type: String,
      default: "https://via.placeholder.com/150",
    },
    privacy: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
    chapters: [
      {
        title: { type: String, required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    rating: {
      type: Number,
      default: 0
    },
    year: {
      type: Number
    },
    isbn: {
      type: String
    },
    pages: {
      type: Number
    },
    likes: { type: Array, default: [] },
  },
  { timestamps: true }
);

// OPTIONAL: Add a text index. 
// This allows you to do basic keyword search in MongoDB before using the advanced Python AI.
BookSchema.index({ title: "text", desc: "text", genres: "text" });

module.exports = mongoose.model("Book", BookSchema);