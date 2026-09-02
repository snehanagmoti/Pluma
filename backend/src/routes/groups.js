const router = require("express").Router();
const Group = require("../models/Group");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");
const { createNotification } = require("../utils/notifications");

// CREATE GROUP
router.post("/", verifyToken, async (req, res) => {
  const newGroup = new Group({
    name: req.body.name,
    description: req.body.description,
    kind: req.body.kind,
    topics: Array.isArray(req.body.topics) ? req.body.topics.slice(0, 8) : [],
    book: req.body.book || null,
    emoji: req.body.emoji || "💬",
    admin: req.user.id,
    members: [req.user.id] // Admin is automatically a member
  });
  
  try {
    const savedGroup = await newGroup.save();
    res.status(201).json(savedGroup);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Group name already exists" });
    }
    res.status(500).json({ message: "Failed to create group" });
  }
});

// GET ALL GROUPS
router.get("/", verifyToken, async (req, res) => {
  try {
    const groups = await Group.find({
      $or: [{ isPrivate: false }, { members: req.user.id }],
    })
      .populate("admin", "username avatar profilePicture")
      .populate("book", "title cover authorName")
      .sort({ createdAt: -1 });
    res.status(200).json(groups);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch groups" });
  }
});

// GET SINGLE GROUP
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("admin", "username avatar profilePicture")
      .populate("members", "username avatar profilePicture bio")
      .populate("book", "title cover authorName");
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.isPrivate && !group.members.some(member => member._id.toString() === req.user.id)) {
      return res.status(403).json({ message: "This is a private channel" });
    }
    res.status(200).json(group);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch group" });
  }
});

// JOIN / LEAVE GROUP
router.put("/:id/join", verifyToken, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    const isMember = group.members.some(member => member.toString() === req.user.id);

    if (group.isPrivate && !isMember) {
      return res.status(403).json({ message: "This is a private channel" });
    }

    if (group.admin.toString() === req.user.id && isMember) {
      return res.status(400).json({ message: "The channel owner cannot leave their own channel" });
    }

    if (!isMember) {
      await group.updateOne({ $push: { members: req.user.id } });
      const actor = await User.findById(req.user.id).select("username").lean();
      await createNotification({
        recipient: group.admin,
        actor: req.user.id,
        type: "channel_join",
        text: `${actor?.username || "A reader"} joined ${group.name}`,
        link: `/groups/${group._id}`,
        entityId: group._id,
      });
      res.status(200).json({ message: "Joined group" });
    } else {
      await group.updateOne({ $pull: { members: req.user.id } });
      res.status(200).json({ message: "Left group" });
    }
  } catch (err) {
    res.status(500).json({ message: "Action failed" });
  }
});

module.exports = router;
