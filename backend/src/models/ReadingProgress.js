const mongoose = require("mongoose");

const ReadingProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true, index: true },
  chapterIndex: { type: Number, min: 0, default: 0 },
  scrollPercent: { type: Number, min: 0, max: 100, default: 0 },
  completedChapters: [{ type: Number, min: 0 }],
  completed: { type: Boolean, default: false },
  lastReadAt: { type: Date, default: Date.now },
}, { timestamps: true });

ReadingProgressSchema.index({ user: 1, book: 1 }, { unique: true });
ReadingProgressSchema.index({ user: 1, lastReadAt: -1 });

module.exports = mongoose.model("ReadingProgress", ReadingProgressSchema);
