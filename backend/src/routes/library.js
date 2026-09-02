const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const { getLibrary, addLibraryItem, removeLibraryItem, updateLibraryItem } = require("../controllers/libraryController");

router.use(verifyToken);
router.get("/", getLibrary);
router.post("/", addLibraryItem);
router.patch("/:canonicalId", updateLibraryItem);
router.delete("/:canonicalId", removeLibraryItem);

module.exports = router;
