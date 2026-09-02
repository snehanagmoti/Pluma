// server/src/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
      maxlength: 30,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      maxlength: 50,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
      // Not required — Google auth users won't have a password
    },
    // --- Google OAuth ---
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values (for non-Google users)
      select: false,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    // --- Profile ---
    avatar: {
      type: String,
      default: "",
    },
    profilePicture: {
      type: String,
      default: "",
    },
    coverPicture: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      maxlength: 500,
      default: "",
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    // --- Social ---
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    followings: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isAdmin: {
      type: Boolean,
      default: false,
    },
    // --- Location ---
    city: {
      type: String,
      maxlength: 50,
    },
    from: {
      type: String,
      maxlength: 50,
    },
    // --- Library & Recommendations ---
    library: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book",
      },
    ],
    recommendedForYou: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book",
      },
    ],
    // --- Reading Stats ---
    readingStats: {
      booksRead: { type: Number, default: 0 },
      totalPagesRead: { type: Number, default: 0 },
      favoriteGenres: [{ type: String }],
      readingStreak: { type: Number, default: 0 },
      lastReadDate: { type: Date },
    },
    // --- Preferences ---
    preferredLanguage: {
      type: String,
      default: "en",
    },
    // AI Writing Preferences — persisted per user
    aiPreferences: {
      defaultTone: { type: String, default: "" },
      styleGuide: { type: String, default: "" }, // e.g., "Write like Brandon Sanderson"
      autoFleshOut: { type: Boolean, default: false },
    },
    // BYOK (Bring Your Own Key) — encrypted API keys for multi-model support
    apiKeys: {
      openai: { type: String, default: "", select: false },
      anthropic: { type: String, default: "", select: false },
      gemini: { type: String, default: "", select: false }, // Override for personal Gemini key
    },
    // Per-task model preferences — which provider/model to use for each AI task
    preferredModels: {
      draftProvider: { type: String, enum: ["gemini", "openai", "anthropic"], default: "gemini" },
      draftModel: { type: String, default: "" },
      editProvider: { type: String, enum: ["gemini", "openai", "anthropic"], default: "gemini" },
      editModel: { type: String, default: "" },
      brainstormProvider: { type: String, enum: ["gemini", "openai", "anthropic"], default: "gemini" },
      brainstormModel: { type: String, default: "" },
      summarizeProvider: { type: String, enum: ["gemini", "openai", "anthropic"], default: "gemini" },
      summarizeModel: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
