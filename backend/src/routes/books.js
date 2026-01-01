// server/src/routes/books.js
const router = require("express").Router();

// 1. Import the middleware you created
// Ensure your auth.js is exporting properly
const { verifyToken } = require("../middleware/auth");

const { 
  createBook, 
  updateBook, 
  getBook, 
  getAllBooks, 
  getUserBooks,
  searchBooks
} = require("../controllers/bookController");

/* 2. Apply middleware (verifyToken) as the second argument.
   Now, if a user hits these routes without a token, the 
   server will reject the request.
*/

// WRITE OPERATIONS (Crucial to protect)
router.post("/", verifyToken, createBook);
router.put("/:id", verifyToken, updateBook);

// READ OPERATIONS
// You specifically mentioned you don't want the homepage (Feed) visible 
// without login, so we MUST protect 'getAllBooks'.
router.get("/public", verifyToken, getAllBooks); 

// Protect Search and Profile views
router.get("/search", verifyToken, searchBooks); 
router.get("/profile/:username", verifyToken, getUserBooks); 

// Protect individual book view
router.get("/find/:id", verifyToken, getBook);

module.exports = router;