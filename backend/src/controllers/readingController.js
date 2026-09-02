const mongoose = require("mongoose");
const Book = require("../models/Book");
const ReadingProgress = require("../models/ReadingProgress");
const Interaction = require("../models/Interaction");
const User = require("../models/User");

const getProgress = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.bookId)) return res.status(400).json({ message: "Invalid book" });
  const progress = await ReadingProgress.findOne({ user: req.user.id, book: req.params.bookId }).lean();
  res.status(200).json({ progress: progress || { chapterIndex: 0, scrollPercent: 0, completedChapters: [], completed: false } });
};

const saveProgress = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.bookId)) return res.status(400).json({ message: "Invalid book" });
  const book = await Book.findOne({ _id: req.params.bookId, $or: [{ privacy: "public" }, { userId: req.user.id }] }).select("chapters genres pages").lean();
  if (!book) return res.status(404).json({ message: "Book not found" });
  const maxChapter = Math.max(0, (book.chapters?.length || 1) - 1);
  const chapterIndex = Math.min(maxChapter, Math.max(0, Number(req.body.chapterIndex) || 0));
  const scrollPercent = Math.min(100, Math.max(0, Number(req.body.scrollPercent) || 0));
  const completed = Boolean(req.body.completed || (chapterIndex === maxChapter && scrollPercent >= 95));
  const existing = await ReadingProgress.findOne({ user: req.user.id, book: book._id }).select("completed").lean();
  const progress = await ReadingProgress.findOneAndUpdate(
    { user: req.user.id, book: book._id },
    { $set: { chapterIndex, scrollPercent, completed, lastReadAt: new Date() }, ...(scrollPercent >= 95 ? { $addToSet: { completedChapters: chapterIndex } } : {}) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  if (completed && !existing?.completed) {
    await Promise.all([
      User.updateOne({ _id: req.user.id }, { $inc: { "readingStats.booksRead": 1, "readingStats.totalPagesRead": Math.max(0, Number(book.pages) || 0) }, $set: { "readingStats.lastReadDate": new Date() }, $addToSet: { "readingStats.favoriteGenres": { $each: (book.genres || []).slice(0, 3) } } }),
      Interaction.create({ user: req.user.id, canonicalId: `pluma:${book._id}`, event: "complete", context: "reader" }),
    ]);
  }
  res.status(200).json({ progress });
};

module.exports = { getProgress, saveProgress };
