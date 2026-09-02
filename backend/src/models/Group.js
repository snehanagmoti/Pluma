const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      max: 500,
    },
    kind: {
      type: String,
      enum: ["topic", "book-club", "fan-club", "writing-circle"],
      default: "topic",
    },
    topics: [{ type: String, trim: true }],
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      default: null,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    books: {
      type: [String], // IDs of books discussed or recommended in the group
      default: [],
    },
    color: {
      type: String,
      default: "linear-gradient(135deg, #667eea, #764ba2)",
    },
    emoji: {
      type: String,
      default: "💬",
      maxlength: 8,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", GroupSchema);
