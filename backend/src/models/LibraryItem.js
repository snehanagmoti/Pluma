const mongoose = require("mongoose");

const LibraryItemSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  canonicalId: { type: String, required: true, trim: true },
  source: { type: String, enum: ["pluma", "openlibrary"], required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", default: null },
  externalKey: { type: String, default: "" },
  snapshot: {
    title: { type: String, default: "", maxlength: 400 },
    authorName: { type: String, default: "", maxlength: 300 },
    desc: { type: String, default: "", maxlength: 5000 },
    cover: { type: String, default: "", maxlength: 1000 },
    genres: [{ type: String, lowercase: true, trim: true }],
    rating: { type: Number, min: 0, max: 5, default: 0 },
    ratingsCount: { type: Number, min: 0, default: 0 },
    firstPublishYear: Number,
    readUrl: { type: String, default: "", maxlength: 1000 },
  },
  status: { type: String, enum: ["saved", "reading", "finished"], default: "saved" },
  rating: { type: Number, min: 0, max: 5, default: null },
}, { timestamps: true });

LibraryItemSchema.index({ user: 1, canonicalId: 1 }, { unique: true });
LibraryItemSchema.index({ canonicalId: 1, createdAt: -1 });

module.exports = mongoose.model("LibraryItem", LibraryItemSchema);
