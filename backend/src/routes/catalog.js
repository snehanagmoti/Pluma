const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const { searchCatalog, getFeaturedCatalog } = require("../controllers/catalogController");

router.use(verifyToken);
router.get("/featured", getFeaturedCatalog);
router.get("/search", searchCatalog);

module.exports = router;
