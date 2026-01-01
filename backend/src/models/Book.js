// server/src/models/Book.js
const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    authorName: {
      type: String, // Storing this makes search easier
      required: true,
    },
    title: {
      type: String,
      required: true,
      index: true, // Optimizes search speed
    },
    desc: {
      type: String,
      maxlength: 500,
    },
    cover: {
      type: String,
      default: "https://via.placeholder.com/150",
    },
    privacy: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
    // Simple Array of objects for chapters
    chapters: [
      {
        title: { type: String, required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    likes: { type: Array, default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", BookSchema);