// src/controllers/authController.js
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// apiKeys.* are schema-level select:false. Excluding both the parent and its
// children produces a Mongo projection path collision, so only list top-level
// secrets here.
const PRIVATE_FIELDS = "-password -googleId";

// Helper: generate JWT token
const generateToken = (user) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
  return jwt.sign(
    { id: user._id, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Helper: sanitize user response (remove password)
const sanitizeUser = (user) => {
  const { password, googleId, apiKeys, ...userData } = user._doc || user;
  return userData;
};

// REGISTER
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: "Email is already registered" });
      }
      return res.status(400).json({ message: "Username is already taken" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      authProvider: "local",
    });

    const user = await newUser.save();
    const token = generateToken(user);

    res.status(201).json({
      ...sanitizeUser(user),
      token,
      message: "Account created successfully!",
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// LOGIN
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({
        message: "This account uses Google Sign-In. Please use the Google button."
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    const token = generateToken(user);

    res.status(200).json({ ...sanitizeUser(user), token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// GOOGLE AUTH
const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ googleId }, { email }] }).select("+googleId");

    if (user) {
      // Update Google info if needed
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = "google";
        if (!user.avatar) user.avatar = picture;
        await user.save();
      }
    } else {
      // Create new user
      // Generate unique username from name
      let username = name.replace(/\s+/g, '').toLowerCase();
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        username = `${username}${Date.now().toString().slice(-4)}`;
      }

      user = new User({
        username,
        email,
        googleId,
        authProvider: "google",
        avatar: picture,
        profilePicture: picture,
      });
      await user.save();
    }

    const token = generateToken(user);

    res.status(200).json({ ...sanitizeUser(user), token });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ message: "Google authentication failed. Please try again." });
  }
};

// GET PROFILE
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select(PRIVATE_FIELDS)
      .populate("library")
      .populate("recommendedForYou");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET USER BY USERNAME
const getUserByUsername = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select(PRIVATE_FIELDS);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { registerUser, loginUser, googleAuth, getProfile, getUserByUsername };
