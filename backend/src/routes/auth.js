// src/routes/auth.js
const router = require("express").Router();
const { registerUser, loginUser } = require("../controllers/authController"); // Import loginUser

// REGISTER
router.post("/register", registerUser);

// LOGIN (New Route)
router.post("/login", loginUser);

module.exports = router;