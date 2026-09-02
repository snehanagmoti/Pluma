// src/routes/users.js
const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const User = require("../models/User");
const { createNotification } = require("../utils/notifications");
const {
  updateUser,
  deleteUser,
  getUser,
  addToLibrary,
  removeFromLibrary,
} = require("../controllers/userController");

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Search readers for follows and direct messages. Keep this before /:id.
router.get("/search", verifyToken, async (req, res) => {
  try {
    const query = req.query.q?.trim() || "";
    const filter = { _id: { $ne: req.user.id } };
    if (query) {
      const pattern = new RegExp(escapeRegex(query), "i");
      filter.$or = [{ username: pattern }, { bio: pattern }];
    }
    const users = await User.find(filter)
      .select("username avatar profilePicture bio followers")
      .sort({ username: 1 })
      .limit(20)
      .lean();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to search readers" });
  }
});

// Get user by ID
router.get("/:id", verifyToken, getUser);

// Update user
router.put("/:id", verifyToken, updateUser);

// Delete user
router.delete("/:id", verifyToken, deleteUser);

// Library management
router.put("/:id/library/add", verifyToken, addToLibrary);
router.put("/:id/library/remove", verifyToken, removeFromLibrary);

// FOLLOW USER
router.put("/:id/follow", verifyToken, async (req, res) => {
  if (req.user.id === req.params.id) {
    return res.status(403).json({ message: "You cannot follow yourself" });
  }
  try {
    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!targetUser.followers.some(id => id.toString() === req.user.id)) {
      await targetUser.updateOne({ $push: { followers: req.user.id } });
      await currentUser.updateOne({ $push: { followings: req.params.id } });
      await createNotification({
        recipient: targetUser._id,
        actor: currentUser._id,
        type: "follow",
        text: `${currentUser.username} started following you`,
        link: `/profile/${currentUser.username}`,
        entityId: currentUser._id,
      });
      res.status(200).json({ message: "User has been followed" });
    } else {
      res.status(403).json({ message: "You already follow this user" });
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

// UNFOLLOW USER
router.put("/:id/unfollow", verifyToken, async (req, res) => {
  if (req.user.id === req.params.id) {
    return res.status(403).json({ message: "You cannot unfollow yourself" });
  }
  try {
    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (targetUser.followers.some(id => id.toString() === req.user.id)) {
      await targetUser.updateOne({ $pull: { followers: req.user.id } });
      await currentUser.updateOne({ $pull: { followings: req.params.id } });
      res.status(200).json({ message: "User has been unfollowed" });
    } else {
      res.status(403).json({ message: "You don't follow this user" });
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

// MARK BOOK AS READ
router.put("/:id/mark-read", verifyToken, async (req, res) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ message: "You can only update your own stats" });
  }
  try {
    const user = await User.findById(req.params.id);

    // Ensure readingStats exists
    if (!user.readingStats) {
      user.readingStats = { booksRead: 0, pagesRead: 0, readingStreak: 0 };
    }

    // Simple increment (could be expanded to check if book was already read)
    await user.updateOne({ $inc: { "readingStats.booksRead": 1 } });

    res.status(200).json({ message: "Book marked as read" });
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
