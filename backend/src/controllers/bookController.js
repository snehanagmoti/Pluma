const Book = require("../models/Book");
const User = require("../models/User");
const mongoose = require("mongoose");
const redisClient = require("../config/redis");
const { emitEvent } = require("../config/kafka");
const { createNotification } = require("../utils/notifications");
const Interaction = require("../models/Interaction");

const EDITABLE_FIELDS = ["title", "desc", "genres", "cover", "privacy", "status", "chapters", "storyContext", "relationshipMatrix", "year", "isbn", "pages", "language"];
const publicBookFilter = { privacy: "public", $or: [{ status: "published" }, { status: { $exists: false } }] };
const pick = (source, fields) => Object.fromEntries(fields.filter(field => Object.prototype.hasOwnProperty.call(source || {}, field)).map(field => [field, source[field]]));
const normalizeGenres = values => [...new Set((Array.isArray(values) ? values : []).map(value => String(value).trim().toLowerCase()).filter(Boolean))].slice(0, 8);

const safeBookPayload = body => {
  const value = pick(body, EDITABLE_FIELDS);
  if (Object.prototype.hasOwnProperty.call(value, "title")) value.title = String(value.title || "").trim().slice(0, 300);
  if (Object.prototype.hasOwnProperty.call(value, "desc")) value.desc = String(value.desc || "").trim().slice(0, 5000);
  if (Object.prototype.hasOwnProperty.call(value, "genres")) value.genres = normalizeGenres(value.genres);
  if (Object.prototype.hasOwnProperty.call(value, "cover")) value.cover = String(value.cover || "").trim().slice(0, 1500);
  if (Object.prototype.hasOwnProperty.call(value, "chapters")) value.chapters = Array.isArray(value.chapters) ? value.chapters.slice(0, 500) : [];
  return value;
};

// CREATE BOOK
const createBook = async (req, res) => {
  try {
    const author = await User.findById(req.user.id).select("username").lean();
    const payload = safeBookPayload(req.body);
    const isDraft = payload.status === "draft" || req.body.asDraft === true;
    const newBook = new Book({
      ...payload,
      userId: req.user.id,
      authorName: author?.username || "Writer",
      title: payload.title || "Untitled story",
      privacy: isDraft ? "private" : (payload.privacy || "public"),
      status: isDraft ? "draft" : "published",
      publishedAt: isDraft ? null : new Date(),
      chapters: payload.chapters?.length ? payload.chapters : [{ title: "Chapter 1", content: "" }],
    });
    const savedBook = await newBook.save();

    // Invalidate Redis caches
    if (redisClient.status === "ready") {
      await redisClient.del("books:all");
    }

    // Emit Kafka Event
    emitEvent("book.created", { bookId: savedBook._id, userId: req.user.id });

    res.status(201).json(savedBook);
  } catch (err) {
    console.error("Create book error:", err);
    res.status(500).json({ message: "Failed to create book" });
  }
};

// GET CURRENT USER'S BOOKS (includes private projects)
const getMyBooks = async (req, res) => {
  try {
    const books = await Book.find({ userId: req.user.id })
      .select("title desc genres cover privacy status chapters updatedAt planningBoard")
      .sort({ updatedAt: -1 })
      .lean();
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch your projects" });
  }
};

const getPlanningBoard = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).select("userId title planningBoard").lean();
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.userId !== req.user.id) return res.status(403).json({ message: "This board belongs to another writer" });
    res.status(200).json({ bookId: book._id, title: book.title, planningBoard: book.planningBoard });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch planning board" });
  }
};

const updatePlanningBoard = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).select("userId planningBoard updatedAt");
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.userId !== req.user.id) return res.status(403).json({ message: "This board belongs to another writer" });

    const columns = ["ideas", "toDraft", "drafting", "editing", "done"];
    const board = {};
    for (const column of columns) {
      board[column] = Array.isArray(req.body.planningBoard?.[column])
        ? req.body.planningBoard[column].slice(0, 200).map(card => ({
            id: String(card.id),
            title: String(card.title || "").trim().slice(0, 300),
          })).filter(card => card.id && card.title)
        : [];
    }
    book.planningBoard = board;
    await book.save();
    res.status(200).json({ planningBoard: book.planningBoard, savedAt: book.updatedAt });
  } catch (err) {
    res.status(500).json({ message: "Failed to save planning board" });
  }
};

const getStoryCanvas = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).select("userId title storyCanvas").lean();
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.userId !== req.user.id) return res.status(403).json({ message: "This canvas belongs to another writer" });
    res.status(200).json({ bookId: book._id, title: book.title, storyCanvas: book.storyCanvas || { nodes: [], edges: [] } });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch story canvas" });
  }
};

const updateStoryCanvas = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).select("userId storyCanvas updatedAt");
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.userId !== req.user.id) return res.status(403).json({ message: "This canvas belongs to another writer" });
    const raw = req.body.storyCanvas || {};
    const nodes = (Array.isArray(raw.nodes) ? raw.nodes : []).slice(0, 500).map(node => ({
      id: String(node.id || "").slice(0, 100),
      position: { x: Number(node.position?.x) || 0, y: Number(node.position?.y) || 0 },
      data: {
        label: String(node.data?.label || "").trim().slice(0, 300),
        content: String(node.data?.content || "").trim().slice(0, 5000),
        type: ["plot", "character", "location", "event", "idea", "ai"].includes(node.data?.type) ? node.data.type : "plot",
      },
    })).filter(node => node.id && node.data.label);
    const nodeIds = new Set(nodes.map(node => node.id));
    const edges = (Array.isArray(raw.edges) ? raw.edges : []).slice(0, 1000).map(edge => ({
      id: String(edge.id || `${edge.source}-${edge.target}`).slice(0, 100),
      source: String(edge.source || "").slice(0, 100),
      target: String(edge.target || "").slice(0, 100),
      label: String(edge.label || "").slice(0, 300),
    })).filter(edge => edge.id && nodeIds.has(edge.source) && nodeIds.has(edge.target));
    book.storyCanvas = { nodes, edges };
    await book.save();
    res.status(200).json({ storyCanvas: book.storyCanvas, savedAt: book.updatedAt });
  } catch (error) {
    res.status(500).json({ message: "Failed to save story canvas" });
  }
};

// GET ALL BOOKS (public)
const getAllBooks = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(48, Math.max(1, Number.parseInt(req.query.limit, 10) || 24));
    const sort = req.query.sort === "trending"
      ? { views: -1, addedByCount: -1, createdAt: -1 }
      : { createdAt: -1 };
    const filter = { ...publicBookFilter };
    if (req.query.genre) filter.genres = String(req.query.genre).toLowerCase().trim();
    if (req.query.q?.trim()) filter.$text = { $search: String(req.query.q).slice(0, 100) };
    const cacheKey = `books:${JSON.stringify({ page, limit, sort: req.query.sort, genre: req.query.genre, q: req.query.q })}`;
    if (redisClient.status === "ready") {
      const cached = await redisClient.get(cacheKey);
      if (cached) return res.status(200).json(JSON.parse(cached));
    }

    const [books, total] = await Promise.all([
      Book.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Book.countDocuments(filter),
    ]);
    res.setHeader("X-Total-Count", total);
    res.setHeader("X-Page", page);

    if (redisClient.status === "ready") {
      await redisClient.set(cacheKey, JSON.stringify(books), "EX", 120);
    }

    res.status(200).json(books);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch books" });
  }
};

// GET SINGLE BOOK
const getBook = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid book" });
    const cacheKey = `book:${req.params.id}`;
    if (redisClient.status === "ready") {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        const cachedBook = JSON.parse(cached);
        if (cachedBook.privacy === "private" && cachedBook.userId !== req.user.id) {
          return res.status(403).json({ message: "This book is private" });
        }
        // Increment views in background, but return fast
        Book.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec().catch(() => undefined);
        Interaction.create({ user: req.user.id, canonicalId: `pluma:${req.params.id}`, event: "view", context: "book-detail" }).catch(() => undefined);
        emitEvent("book.viewed", { bookId: req.params.id, userId: req.user ? req.user.id : null });
        return res.status(200).json(cachedBook);
      }
    }

    const book = await Book.findById(req.params.id).lean();
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.privacy === "private" && book.userId !== req.user.id) {
      return res.status(403).json({ message: "This book is private" });
    }

    // Increment views
    Book.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec().catch(() => undefined);
    Interaction.create({ user: req.user.id, canonicalId: `pluma:${req.params.id}`, event: "view", context: "book-detail" }).catch(() => undefined);

    // Emit Kafka Event
    emitEvent("book.viewed", { bookId: book._id, userId: req.user ? req.user.id : null });

    if (redisClient.status === "ready") {
      await redisClient.set(cacheKey, JSON.stringify(book), "EX", 120);
    }

    res.status(200).json(book);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch book" });
  }
};

// UPDATE BOOK
const updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.userId !== req.user.id) {
      return res.status(403).json({ message: "You can only edit your own books" });
    }

    const update = safeBookPayload(req.body);
    if (update.status === "published") {
      update.privacy = update.privacy || "public";
      if (!book.publishedAt) update.publishedAt = new Date();
    }
    const updated = await Book.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });

    if (redisClient.status === "ready") {
      await redisClient.del(`book:${req.params.id}`);
    }

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update book" });
  }
};

// DELETE BOOK
const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: "You can only delete your own books" });
    }

    await Book.findByIdAndDelete(req.params.id);

    if (redisClient.status === "ready") {
      await redisClient.del(`book:${req.params.id}`);
    }

    res.status(200).json({ message: "Book deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete book" });
  }
};

// LIKE / UNLIKE BOOK
const likeBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.privacy !== "public" && book.userId !== req.user.id) return res.status(403).json({ message: "This book is private" });

    const userId = req.user.id;
    const isLiking = !book.likes.some(id => id.toString() === userId);

    if (isLiking) {
      book.likes.push(userId);
      emitEvent("book.liked", { bookId: book._id, userId });
      const actor = await User.findById(userId).select("username").lean();
      await createNotification({
        recipient: book.userId,
        actor: userId,
        type: "book_like",
        text: `${actor?.username || "Someone"} liked “${book.title}”`,
        link: `/book/${book._id}`,
        entityId: book._id,
      });
    } else {
      book.likes = book.likes.filter(id => id.toString() !== userId);
    }
    await book.save();
    Interaction.create({ user: userId, canonicalId: `pluma:${book._id}`, event: isLiking ? "like" : "unlike", context: "book-detail" }).catch(() => undefined);

    res.status(200).json({ message: "The book has been liked/unliked", likes: book.likes });
  } catch (err) {
    res.status(500).json({ message: "Failed to like/unlike book" });
  }
};

// ADD COMMENT
const addComment = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    if (!req.body.text?.trim()) return res.status(400).json({ message: "Comment text is required" });
    if (req.body.text.trim().length > 1000) return res.status(400).json({ message: "Comments are limited to 1,000 characters" });
    const commenter = await User.findById(req.user.id).select("username").lean();
    const newComment = {
      user: req.user.id,
      username: commenter?.username || "Reader",
      text: req.body.text.trim().slice(0, 1000)
    };

    book.comments.push(newComment);
    await book.save();

    if (redisClient.status === "ready") {
      await redisClient.del(`book:${req.params.id}`);
    }

    await createNotification({
      recipient: book.userId,
      actor: req.user.id,
      type: "book_comment",
      text: `${commenter?.username || "Someone"} commented on “${book.title}”`,
      link: `/book/${book._id}`,
      entityId: book._id,
    });

    res.status(200).json(book);
  } catch (err) {
    res.status(500).json({ message: "Failed to add comment" });
  }
};

module.exports = {
  createBook,
  getAllBooks,
  getMyBooks,
  getBook,
  updateBook,
  deleteBook,
  likeBook,
  addComment,
  getPlanningBoard,
  updatePlanningBoard,
  getStoryCanvas,
  updateStoryCanvas,
};
