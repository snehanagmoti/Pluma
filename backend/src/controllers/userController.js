// src/controllers/userController.js
const User = require("../models/User");
const Book = require("../models/Book");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const SocialPost = require("../models/SocialPost");
const Group = require("../models/Group");
const LibraryItem = require("../models/LibraryItem");
const ReadingProgress = require("../models/ReadingProgress");
const Interaction = require("../models/Interaction");

const PUBLIC_FIELDS = "-password -googleId";
const PROFILE_FIELDS = ["username", "email", "avatar", "profilePicture", "coverPicture", "bio", "isPrivate", "city", "from", "preferredLanguage"];

// Update User
const updateUser = async (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).json({ message: "You can only update your own account" });
  }

  try {
    const update = Object.fromEntries(
      PROFILE_FIELDS.filter(field => Object.prototype.hasOwnProperty.call(req.body, field))
        .map(field => [field, req.body[field]])
    );
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(String(req.body.password), salt);
    }

    const user = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true })
      .select(PUBLIC_FIELDS);

    res.status(200).json(user);
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).json({ message: "You can only delete your own account" });
  }

  try {
    const conversations = await Conversation.find({ participants: req.params.id }).select("_id").lean();
    const conversationIds = conversations.map(item => item._id);
    await Promise.all([
      Book.deleteMany({ userId: req.params.id }),
      Message.deleteMany({ $or: [{ conversation: { $in: conversationIds } }, { sender: req.params.id }] }),
      Conversation.deleteMany({ _id: { $in: conversationIds } }),
      Notification.deleteMany({ $or: [{ recipient: req.params.id }, { actor: req.params.id }] }),
      SocialPost.deleteMany({ author: req.params.id }),
      SocialPost.updateMany({}, { $pull: { likes: req.params.id, reposts: req.params.id, comments: { user: req.params.id } } }),
      Group.updateMany({}, { $pull: { members: req.params.id } }),
      Group.deleteMany({ admin: req.params.id, members: { $size: 0 } }),
      LibraryItem.deleteMany({ user: req.params.id }),
      ReadingProgress.deleteMany({ user: req.params.id }),
      Interaction.deleteMany({ user: req.params.id }),
      User.updateMany({}, { $pull: { followers: req.params.id, followings: req.params.id } }),
    ]);
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Failed to delete account" });
  }
};

// Get User
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(PUBLIC_FIELDS);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Add Book to Library
const addToLibrary = async (req, res) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ message: "You can only update your own library" });
  }
  try {
    const { bookId } = req.body;
    if (!mongoose.isValidObjectId(bookId)) return res.status(400).json({ message: "Invalid book" });
    const book = await Book.findOne({ _id: bookId, $or: [{ privacy: "public", status: "published" }, { userId: req.user.id }] }).lean();
    if (!book) return res.status(404).json({ message: "Book not found" });
    const result = await User.updateOne(
      { _id: req.params.id, library: { $ne: bookId } },
      { $addToSet: { library: bookId } }
    );
    if (!result.modifiedCount) {
      return res.status(400).json({ message: "Book already in library" });
    }
    await Promise.all([
      Book.findByIdAndUpdate(bookId, { $inc: { addedByCount: 1 } }),
      LibraryItem.updateOne(
        { user: req.user.id, canonicalId: `pluma:${bookId}` },
        { $set: { source: "pluma", book: bookId, status: "saved", snapshot: {
          title: book.title, authorName: book.authorName, desc: book.desc, cover: book.cover,
          genres: book.genres, rating: book.rating, ratingsCount: book.ratingCount,
        } } },
        { upsert: true }
      ),
      Interaction.create({ user: req.user.id, canonicalId: `pluma:${bookId}`, event: "save", context: "book-detail" }),
    ]);
    const user = await User.findById(req.params.id).select("library").lean();
    res.status(200).json({ message: "Book added to library", library: user.library });
  } catch (err) {
    console.error("Add to library error:", err);
    res.status(500).json({ message: "Failed to add book to library" });
  }
};

// Remove Book from Library
const removeFromLibrary = async (req, res) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ message: "You can only update your own library" });
  }
  try {
    const { bookId } = req.body;
    if (!mongoose.isValidObjectId(bookId)) return res.status(400).json({ message: "Invalid book" });
    const result = await User.updateOne({ _id: req.params.id, library: bookId }, { $pull: { library: bookId } });
    if (result.modifiedCount) {
      await Promise.all([
        Book.findByIdAndUpdate(bookId, [{ $set: { addedByCount: { $max: [0, { $subtract: ["$addedByCount", 1] }] } } }]),
        LibraryItem.deleteOne({ user: req.user.id, canonicalId: `pluma:${bookId}` }),
        Interaction.create({ user: req.user.id, canonicalId: `pluma:${bookId}`, event: "unsave", context: "library" }),
      ]);
    }
    const user = await User.findById(req.params.id).select("library").lean();
    res.status(200).json({ message: "Book removed from library", library: user?.library || [] });
  } catch (err) {
    console.error("Remove from library error:", err);
    res.status(500).json({ message: "Failed to remove book from library" });
  }
};

module.exports = {
  updateUser,
  deleteUser,
  getUser,
  addToLibrary,
  removeFromLibrary,
};
