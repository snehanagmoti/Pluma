// server/src/controllers/userController.js
const User = require("../models/User");
const Book = require("../models/Book");
const bcrypt = require("bcrypt");
const axios = require("axios"); // REQUIRED for AI communication

// --- HELPER: BACKGROUND AI TASK ---
// This runs separately so it doesn't slow down the user
const updateAIRecommendations = async (userId, libraryIds) => {
  try {
    console.log("🤖 Background: calling AI service...");
    const aiResponse = await axios.post("http://localhost:8000/recommend", {
      book_ids: libraryIds
    });

    if (aiResponse.data.recommendations) {
      await User.findByIdAndUpdate(userId, {
        $set: { recommendedForYou: aiResponse.data.recommendations }
      });
      console.log("✅ Background: Recommendations updated for user", userId);
    }
  } catch (err) {
    console.error("⚠️ Background AI Error:", err.message);
    // We do nothing here so we don't crash the server
  }
};

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

// 1. ADD or REMOVE BOOK (OPTIMIZED)
const toggleLibrary = async (req, res) => {
  if (req.body.userId !== req.params.id) {
    return res.status(403).json("You can only update your own library!");
  }

  try {
    const user = await User.findById(req.params.id);
    const bookId = req.body.bookId;

    if (!user) return res.status(404).json("User not found");

    const isBookPresent = user.library.some(
      (id) => id.toString() === bookId
    );

    let currentLibraryIds = user.library.map(id => id.toString());

    if (!isBookPresent) {
      // --- ADD BOOK ---
      await user.updateOne({ $push: { library: bookId } });

      // Update our local list so we can send it to AI
      currentLibraryIds.push(bookId);

      // 1. RESPOND TO USER IMMEDIATELY (Fast!)
      res.status(200).json("Book has been added to your library");

      // 2. TRIGGER AI IN BACKGROUND (Fire and Forget)
      // We do NOT use 'await' here. We let it run while Node moves on.
      updateAIRecommendations(req.params.id, currentLibraryIds);

    } else {
      // --- REMOVE BOOK ---
      await user.updateOne({ $pull: { library: bookId } });

      // Update local list
      currentLibraryIds = currentLibraryIds.filter(id => id !== bookId);

      // 1. RESPOND IMMEDIATELY
      res.status(200).json("Book has been removed from your library");

      // 2. TRIGGER AI IN BACKGROUND
      updateAIRecommendations(req.params.id, currentLibraryIds);
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

// 2. GET USER'S LIBRARY (Fetch the actual book details)
const getLibrary = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("library");

    res.status(200).json(user.library);
  } catch (err) {
    res.status(500).json(err);
  }
};

// 3. GET USER RECOMMENDATIONS (Populate the actual book details)
const getRecommendations = async (req, res) => {
  try {
    // We find the user and 'populate' the recommendedForYou field.
    // This turns the list of IDs into a list of full Book Objects.
    const user = await User.findById(req.params.id).populate("recommendedForYou");

    // Return just the list of books
    res.status(200).json(user.recommendedForYou);
  } catch (err) {
    res.status(500).json(err);
  }
};

// Update the exports to include the new function
module.exports = { toggleLibrary, getLibrary, updateUser, getRecommendations };