const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 500, trim: true },
  },
  { timestamps: true }
);

const SocialPostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true, maxlength: 1200, trim: true },
    kind: {
      type: String,
      enum: ["thought", "quote", "progress", "question", "recommendation"],
      default: "thought",
    },
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", default: null },
    channel: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null, index: true },
    image: { type: String, default: "" },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reposts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [CommentSchema],
  },
  { timestamps: true }
);

SocialPostSchema.index({ createdAt: -1 });
SocialPostSchema.index({ text: "text" });

module.exports = mongoose.model("SocialPost", SocialPostSchema);
