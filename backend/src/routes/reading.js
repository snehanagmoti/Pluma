const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const { getProgress, saveProgress } = require("../controllers/readingController");

router.use(verifyToken);
router.get("/:bookId", getProgress);
router.put("/:bookId", saveProgress);

module.exports = router;
