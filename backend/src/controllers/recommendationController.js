const Interaction = require("../models/Interaction");
const { getRecommendations } = require("../services/recommendationService");

const recommendations = async (req, res) => {
  try {
    const mode = req.query.mode === "trending" ? "trending" : "personalized";
    const result = await getRecommendations(req.user.id, { mode, limit: req.query.limit });
    res.setHeader("Cache-Control", "private, max-age=60");
    res.status(200).json(result);
  } catch (error) {
    console.error("Recommendation error:", error);
    res.status(500).json({ message: "Could not build recommendations" });
  }
};

const feedback = async (req, res) => {
  const canonicalId = String(req.body.canonicalId || "").slice(0, 100);
  const event = String(req.body.event || "");
  if (!/^(pluma:[a-f\d]{24}|ol:OL\d+W)$/i.test(canonicalId)) return res.status(400).json({ message: "Invalid recommendation item" });
  if (!["impression", "open", "dismiss", "view"].includes(event)) return res.status(400).json({ message: "Invalid feedback event" });
  await Interaction.create({ user: req.user.id, canonicalId, event, context: String(req.body.context || "feed").slice(0, 100), dwellSeconds: Math.min(86400, Math.max(0, Number(req.body.dwellSeconds) || 0)) });
  res.status(202).json({ accepted: true });
};

module.exports = { recommendations, feedback };
