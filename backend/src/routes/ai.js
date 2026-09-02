// src/routes/ai.js
const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const createRateLimiter = require("../middleware/rateLimiter");
const {
  // Existing endpoints
  writeAssist,
  translate,
  generateDescription,
  brainstorm,
  outline,
  toneShift,
  generateStory,
  // Agentic endpoints
  fleshItOut,
  multiAgentWrite,
  generateVariations,
  analyzeNarrative,
  summarizeChapter,
  extractStoryCharacters,
  // NEW endpoints
  auditChapterEndpoint,
  chatWithCharacterEndpoint,
  extractStoryLocations,
  generateCanvasNode,
  branchChapter,
  betaReadChapter,
  analyzeRelationships,
  detectSoundscape,
  showDontTell,
  weaveScene,
  updateAiSettings,
  getAiSettings,
  testAiSettings,
} = require("../controllers/aiController");

// Resolve the user before applying the per-user AI budget.
router.use(verifyToken, createRateLimiter(20, 60), (req, res, next) => {
  const payloadSize = Buffer.byteLength(JSON.stringify(req.body || {}), "utf8");
  if (payloadSize > 160000) return res.status(413).json({ message: "AI context is too large. Save a shorter excerpt or chapter selection." });
  next();
});
// --- Existing routes (unchanged) ---
router.post("/write-assist", writeAssist);
router.post("/translate", translate);
router.post("/generate-description", generateDescription);
router.post("/brainstorm", brainstorm);
router.post("/outline", outline);
router.post("/tone-shift", toneShift);
router.post("/generate-story", generateStory);

// --- Agentic story writing routes ---
router.post("/flesh-it-out", fleshItOut);
router.post("/multi-agent-write", multiAgentWrite);
router.post("/generate-variations", generateVariations);
router.post("/analyze-narrative", analyzeNarrative);
router.post("/summarize-chapter", summarizeChapter);
router.post("/extract-characters", extractStoryCharacters);

// --- NEW: Advanced AI routes ---
router.post("/audit-chapter", auditChapterEndpoint);
router.post("/chat-with-character", chatWithCharacterEndpoint);
router.post("/extract-locations", extractStoryLocations);
router.post("/generate-canvas-node", generateCanvasNode);
router.post("/branch-chapter", branchChapter);
router.post("/beta-read", betaReadChapter);
router.post("/analyze-relationships", analyzeRelationships);
router.post("/detect-soundscape", detectSoundscape);
router.post("/show-dont-tell", showDontTell);
router.post("/weave-scene", weaveScene);

// --- AI Settings ---
router.get("/settings", getAiSettings);
router.put("/settings", updateAiSettings);
router.post("/test", testAiSettings);

module.exports = router;
