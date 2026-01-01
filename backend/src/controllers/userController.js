// server/src/controllers/userController.js
const User = require("../models/User");
const Book = require("../models/Book");
const bcrypt = require("bcrypt");

const updateUser = async (req, res) => {
  // Check if the user is updating their own account
  if (req.body.userId === req.params.id || req.user.isAdmin) {
    
    // 1. If user is changing password, hash it first
    if (req.body.password) {
      try {
        const salt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(req.body.password, salt);
      } catch (err) {
        return res.status(500).json(err);
      }
    }

    // 2. Update the user in the database
    try {
      const user = await User.findByIdAndUpdate(req.params.id, {
        $set: req.body, // This updates username, email, isPrivate, etc.
      }, { new: true }); // {new: true} returns the updated document
      
      res.status(200).json(user); // Send back the updated user data
    } catch (err) {
      return res.status(500).json(err);
    }
  } else {
    return res.status(403).json("You can only update your own account!");
  }
};

// 1. ADD or REMOVE BOOK FROM LIBRARY
const toggleLibrary = async (req, res) => {
  // req.params.id = The User's ID
  // req.body.bookId = The Book's ID we want to save
  if (req.body.userId !== req.params.id) {
    return res.status(403).json("You can only update your own library!");
  }

  try {
    const user = await User.findById(req.params.id);
    const bookId = req.body.bookId;

    // Check if book is already in library
    if (!user.library.includes(bookId)) {
      // ADD IT
      await user.updateOne({ $push: { library: bookId } });
      res.status(200).json("Book has been added to your library");
    } else {
      // REMOVE IT (Toggle logic)
      await user.updateOne({ $pull: { library: bookId } });
      res.status(200).json("Book has been removed from your library");
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

// 2. GET USER'S LIBRARY (Fetch the actual book details)
const getLibrary = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    // user.library contains IDs like ["64f...", "64a..."]
    // We need to convert those IDs into full Book objects
    
    const libraryBooks = await Promise.all(
      user.library.map((bookId) => {
        return Book.findById(bookId);
      })
    );
    
    res.status(200).json(libraryBooks);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports = { toggleLibrary, getLibrary, updateUser };