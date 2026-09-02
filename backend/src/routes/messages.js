const router = require("express").Router();
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");
const { createNotification } = require("../utils/notifications");

const hasParticipant = (conversation, userId) =>
  conversation.participants.some(participant => participant.toString() === userId);

router.get("/conversations", verifyToken, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id })
      .populate("participants", "username avatar profilePicture")
      .sort({ lastMessageAt: -1 })
      .lean();
    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

router.post("/conversations", verifyToken, async (req, res) => {
  try {
    const { recipientId } = req.body;
    if (!recipientId || recipientId === req.user.id) {
      return res.status(400).json({ message: "Choose another reader to message" });
    }
    const recipient = await User.findById(recipientId).select("_id");
    if (!recipient) return res.status(404).json({ message: "Reader not found" });

    const pairKey = [req.user.id, recipientId].sort().join(":");
    let conversation = await Conversation.findOneAndUpdate(
      { pairKey },
      { $setOnInsert: { participants: [req.user.id, recipientId], pairKey } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    conversation = await Conversation.findById(conversation._id)
      .populate("participants", "username avatar profilePicture")
      .lean();
    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ message: "Failed to start conversation" });
  }
});

router.get("/conversations/:id/messages", verifyToken, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    if (!hasParticipant(conversation, req.user.id)) return res.status(403).json({ message: "Access denied" });

    const messages = await Message.find({ conversation: conversation._id })
      .populate("sender", "username avatar profilePicture")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    await Promise.all([
      Message.updateMany({ conversation: conversation._id }, { $addToSet: { readBy: req.user.id } }),
      Conversation.findByIdAndUpdate(conversation._id, { $pull: { unreadBy: req.user.id } }),
    ]);
    res.status(200).json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

router.post("/conversations/:id/messages", verifyToken, async (req, res) => {
  try {
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!text) return res.status(400).json({ message: "Message cannot be empty" });
    if (text.length > 2000) {
      return res.status(400).json({ message: "Messages can be at most 2,000 characters" });
    }
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    if (!hasParticipant(conversation, req.user.id)) return res.status(403).json({ message: "Access denied" });

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user.id,
      text,
      readBy: [req.user.id],
    });
    const recipientId = conversation.participants.find(id => id.toString() !== req.user.id);
    conversation.lastMessage = message.text;
    conversation.lastSender = req.user.id;
    conversation.lastMessageAt = message.createdAt;
    conversation.unreadBy = recipientId ? [recipientId] : [];
    await conversation.save();

    const actor = await User.findById(req.user.id).select("username").lean();
    await createNotification({
      recipient: recipientId,
      actor: req.user.id,
      type: "message",
      text: `${actor?.username || "Someone"} sent you a message`,
      link: `/messages/${conversation._id}`,
      entityId: conversation._id,
    });

    const populated = await Message.findById(message._id)
      .populate("sender", "username avatar profilePicture")
      .lean();
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to send message" });
  }
});

module.exports = router;
