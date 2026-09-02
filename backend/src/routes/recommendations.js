const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const { recommendations, feedback } = require("../controllers/recommendationController");

router.use(verifyToken);
router.get("/", recommendations);
router.post("/feedback", feedback);

module.exports = router;
