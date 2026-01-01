// server/src/controllers/bookController.js
const Book = require("../models/Book");

// 1. CREATE BOOK
const createBook = async (req, res) => {
  const newBook = new Book(req.body);
  try {
    const savedBook = await newBook.save();
    res.status(200).json(savedBook);
  } catch (err) {
    res.status(500).json(err);
  }
};

// 2. UPDATE BOOK
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

// 5. GET USER'S BOOKS (Profile)
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

// 6. SEARCH BOOKS (The new feature)
const searchBooks = async (req, res) => {
  const query = req.query.q; // What user typed (e.g. "Harry Potter")
  const type = req.query.type; // "book" or "author"

  try {
    let books;
    if (type === "author") {
      // Search by Author Name (Partial match allowed due to $regex)
      books = await Book.find({ 
        authorName: { $regex: query, $options: "i" },
        privacy: "public"
      });
    } else {
      // Search by Book Title (Default)
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