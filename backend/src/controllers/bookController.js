// server/src/controllers/bookController.js
const Book = require("../models/Book");

// 1. CREATE BOOK
const createBook = async (req, res) => {
  if (!req.body.genres || req.body.genres.length === 0) {
    return res.status(400).json("At least one genre is required.");
  }
  const newBook = new Book(req.body);
  try {
    // A. Save to Database
    const savedBook = await newBook.save();

    // B. Trigger AI Refresh (The New Part)
    // We tell Python: "Data changed! Re-learn everything."
    try {
      await axios.post("http://localhost:8000/refresh");
      console.log("✅ AI Service notified: Data refreshed.");
    } catch (aiError) {
      // We log the error but DO NOT fail the request. 
      // The book is saved, that's what matters most to the user.
      console.error("⚠️ AI Refresh Warning:", aiError.message);
    }

    res.status(200).json(savedBook);
  } catch (err) {
    res.status(500).json(err);
  }
};

// 2. UPDATE BOOK(not used yet)
const updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (book.userId === req.body.userId) {
      await book.updateOne({ $set: req.body });
      res.status(200).json("The book has been updated");
    } else {
      res.status(403).json("You can only update your own book!");
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

// 3. GET A BOOK (Read)
const getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    res.status(200).json(book);
  } catch (err) {
    res.status(500).json(err);
  }
};

// 4. GET ALL PUBLIC BOOKS (Feed)
const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find({ privacy: "public" }).sort({ createdAt: -1 });
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json(err);
  }
};

// 5. GET USER'S BOOKS (Profile) ; this is also not used yet
const getUserBooks = async (req, res) => {
  try {
    // If viewing another user's profile, only show Public books
    // If viewing own profile, show all. (We will handle this logic on frontend for now)
    const books = await Book.find({ authorName: req.params.username, privacy: "public" });
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json(err);
  }
};

// 6. SEARCH BOOKS (Updated to support Genres)
const searchBooks = async (req, res) => {
  const query = req.query.q;
  const type = req.query.type; // "book", "author", or "genre"

  try {
    let books;
    if (type === "author") {
      books = await Book.find({
        authorName: { $regex: query, $options: "i" },
        privacy: "public"
      });
    } else if (type === "genre") {
      // NEW: Search by Genre tag
      books = await Book.find({
        genres: { $in: [query.toLowerCase()] },
        privacy: "public"
      });
    } else {
      // Default: Search by Title
      books = await Book.find({
        title: { $regex: query, $options: "i" },
        privacy: "public"
      });
    }
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports = { createBook, updateBook, getBook, getAllBooks, getUserBooks, searchBooks };