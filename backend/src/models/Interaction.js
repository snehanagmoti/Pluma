const mongoose = require("mongoose");

const InteractionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  canonicalId: { type: String, required: true, index: true },
  event: {
    type: String,
    enum: ["impression", "open", "view", "save", "unsave", "like", "unlike", "complete", "rate", "dismiss"],
    required: true,
  },
  value: { type: Number, default: 1 },
  dwellSeconds: { type: Number, min: 0, max: 86400, default: 0 },
  context: { type: String, maxlength: 100, default: "" },
}, { timestamps: true });

InteractionSchema.index({ user: 1, createdAt: -1 });
InteractionSchema.index({ canonicalId: 1, event: 1, createdAt: -1 });

module.exports = mongoose.model("Interaction", InteractionSchema);
