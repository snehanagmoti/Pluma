const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: {
      type: String,
      enum: ["follow", "post_like", "post_comment", "book_like", "book_comment", "message", "channel_join", "channel_post"],
      required: true,
    },
    text: { type: String, required: true, maxlength: 240 },
    link: { type: String, default: "" },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
