// src/routes/auth.js
const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const {
  registerUser,
  loginUser,
  googleAuth,
  getProfile,
  getUserByUsername
} = require("../controllers/authController");

// Public Routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleAuth);

// Protected Routes
router.get("/profile", verifyToken, getProfile);
router.get("/user/:username", verifyToken, getUserByUsername);

module.exports = router;