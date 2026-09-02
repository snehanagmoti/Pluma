const mongoose = require("mongoose");
const Book = require("../models/Book");
const User = require("../models/User");
const LibraryItem = require("../models/LibraryItem");
const Interaction = require("../models/Interaction");

const normalizeItem = item => {
  if (item.source === "pluma" && item.book) return { ...item.book, canonicalId: item.canonicalId, libraryStatus: item.status, savedAt: item.createdAt };
  return { ...item.snapshot, _id: item.canonicalId, id: item.canonicalId, canonicalId: item.canonicalId, source: item.source, isExternal: true, externalKey: item.externalKey, libraryStatus: item.status, savedAt: item.createdAt };
};

const getLibrary = async (req, res) => {
  const [items, legacyUser] = await Promise.all([
    LibraryItem.find({ user: req.user.id }).populate({ path: "book", match: { $or: [{ privacy: "public" }, { userId: req.user.id }] }, options: { lean: true } }).sort({ updatedAt: -1 }).lean(),
    User.findById(req.user.id).select("library").populate({ path: "library", options: { lean: true } }).lean(),
  ]);
  const normalized = items.map(normalizeItem).filter(item => item.title);
  const known = new Set(items.map(item => item.canonicalId));
  const legacy = (legacyUser?.library || []).filter(book => book?._id && !known.has(`pluma:${book._id}`)).map(book => ({ ...book, canonicalId: `pluma:${book._id}`, libraryStatus: "saved" }));
  // Lazy migration keeps existing accounts intact without a blocking data migration.
  if (legacy.length) {
    LibraryItem.bulkWrite(legacy.map(book => ({ updateOne: {
      filter: { user: req.user.id, canonicalId: book.canonicalId },
      update: { $setOnInsert: { source: "pluma", book: book._id, status: "saved", snapshot: { title: book.title, authorName: book.authorName, desc: book.desc, cover: book.cover, genres: book.genres, rating: book.rating, ratingsCount: book.ratingCount } } },
      upsert: true,
    } }))).catch(() => undefined);
  }
  res.status(200).json({ items: [...normalized, ...legacy] });
};

const addLibraryItem = async (req, res) => {
  try {
    let source;
    let canonicalId;
    let book = null;
    let externalKey = "";
    let snapshot = {};
    if (req.body.bookId) {
      if (!mongoose.isValidObjectId(req.body.bookId)) return res.status(400).json({ message: "Invalid book" });
      book = await Book.findOne({ _id: req.body.bookId, $or: [{ privacy: "public" }, { userId: req.user.id }] }).lean();
      if (!book) return res.status(404).json({ message: "Book not found" });
      source = "pluma";
      canonicalId = `pluma:${book._id}`;
      snapshot = { title: book.title, authorName: book.authorName, desc: book.desc, cover: book.cover, genres: book.genres, rating: book.rating, ratingsCount: book.ratingCount };
    } else {
      const external = req.body.externalBook || {};
      const workId = String(external.canonicalId || external._id || "").replace(/^ol:/, "").replace(/^\/works\//, "");
      if (!/^OL\d+W$/i.test(workId)) return res.status(400).json({ message: "Invalid Open Library work" });
      source = "openlibrary";
      canonicalId = `ol:${workId}`;
      externalKey = `/works/${workId}`;
      snapshot = {
        title: String(external.title || "Untitled").slice(0, 400),
        authorName: String(external.authorName || "Unknown author").slice(0, 300),
        desc: String(external.desc || "").slice(0, 5000),
        cover: String(external.cover || "").slice(0, 1000),
        genres: (external.genres || []).map(value => String(value).toLowerCase()).slice(0, 8),
        rating: Math.min(5, Math.max(0, Number(external.rating) || 0)),
        ratingsCount: Math.max(0, Number(external.ratingsCount) || 0),
        firstPublishYear: Number(external.firstPublishYear || external.year) || undefined,
        readUrl: String(external.readUrl || `https://openlibrary.org/works/${workId}`).slice(0, 1000),
      };
    }
    const existing = await LibraryItem.exists({ user: req.user.id, canonicalId });
    const item = await LibraryItem.findOneAndUpdate(
      { user: req.user.id, canonicalId },
      { $set: { source, book: book?._id || null, externalKey, snapshot, status: "saved" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    if (source === "pluma" && !existing) {
      await Promise.all([
        User.updateOne({ _id: req.user.id }, { $addToSet: { library: book._id } }),
        Book.updateOne({ _id: book._id }, { $inc: { addedByCount: 1 } }),
      ]);
    }
    Interaction.create({ user: req.user.id, canonicalId, event: "save", context: "catalog" }).catch(() => undefined);
    res.status(201).json({ item: normalizeItem({ ...item, book }) });
  } catch (error) {
    res.status(500).json({ message: "Could not save this book" });
  }
};

const removeLibraryItem = async (req, res) => {
  const canonicalId = decodeURIComponent(req.params.canonicalId || "");
  const item = await LibraryItem.findOneAndDelete({ user: req.user.id, canonicalId });
  if (!item) return res.status(404).json({ message: "Library item not found" });
  if (item.source === "pluma" && item.book) {
    await Promise.all([
      User.updateOne({ _id: req.user.id }, { $pull: { library: item.book } }),
      Book.findByIdAndUpdate(item.book, [{ $set: { addedByCount: { $max: [0, { $subtract: ["$addedByCount", 1] }] } } }]),
    ]);
  }
  Interaction.create({ user: req.user.id, canonicalId, event: "unsave", context: "library" }).catch(() => undefined);
  res.status(200).json({ message: "Removed from library" });
};

const updateLibraryItem = async (req, res) => {
  const status = ["saved", "reading", "finished"].includes(req.body.status) ? req.body.status : undefined;
  const rating = req.body.rating === undefined ? undefined : Math.min(5, Math.max(0, Number(req.body.rating)));
  const update = {};
  if (status) update.status = status;
  if (Number.isFinite(rating)) update.rating = rating;
  const item = await LibraryItem.findOneAndUpdate({ user: req.user.id, canonicalId: decodeURIComponent(req.params.canonicalId || "") }, { $set: update }, { new: true }).lean();
  if (!item) return res.status(404).json({ message: "Library item not found" });
  res.status(200).json({ item });
};

module.exports = { getLibrary, addLibraryItem, removeLibraryItem, updateLibraryItem };
