// server/src/routes/users.js
const router = require("express").Router();

// 1. Import the middleware
const { verifyToken } = require("../middleware/auth");

const { toggleLibrary, getLibrary, updateUser } = require("../controllers/userController");

// 2. Apply middleware to protect the routes
router.put("/:id", verifyToken, updateUser);
// Update Library (Add/Remove) - Protected
router.put("/:id/library", verifyToken, toggleLibrary);

// Get Library Content - Protected
router.get("/:id/library", verifyToken, getLibrary);

module.exports = router;