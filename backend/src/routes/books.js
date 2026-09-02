// src/routes/books.js
const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const {
  createBook,
  getAllBooks,
  getMyBooks,
  getBook,
  updateBook,
  deleteBook,
  likeBook,
  addComment,
  getPlanningBoard,
  updatePlanningBoard,
  getStoryCanvas,
  updateStoryCanvas,
} = require("../controllers/bookController");

// Public
router.get("/all", verifyToken, getAllBooks);
router.get("/mine", verifyToken, getMyBooks);

// Protected
router.post("/", verifyToken, createBook);
router.get("/:id/planning", verifyToken, getPlanningBoard);
router.put("/:id/planning", verifyToken, updatePlanningBoard);
router.get("/:id/canvas", verifyToken, getStoryCanvas);
router.put("/:id/canvas", verifyToken, updateStoryCanvas);
router.get("/:id", verifyToken, getBook);
router.put("/:id", verifyToken, updateBook);
router.delete("/:id", verifyToken, deleteBook);
router.put("/:id/like", verifyToken, likeBook);

// ADD COMMENT
router.post("/:id/comment", verifyToken, addComment);

module.exports = router;
