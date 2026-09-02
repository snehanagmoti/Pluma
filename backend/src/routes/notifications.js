const router = require("express").Router();
const Notification = require("../models/Notification");
const { verifyToken } = require("../middleware/auth");

router.get("/", verifyToken, async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user.id })
        .populate("actor", "username avatar profilePicture")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Notification.countDocuments({ recipient: req.user.id, read: false }),
    ]);
    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

router.put("/read-all", verifyToken, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, read: false }, { $set: { read: true } });
    res.status(200).json({ message: "Notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notifications" });
  }
});

router.put("/:id/read", verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { $set: { read: true } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: "Failed to update notification" });
  }
});

module.exports = router;
