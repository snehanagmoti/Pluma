// src/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true, // No two users can have the same username
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      maxlength: 50,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePicture: {
      type: String,
      default: "", // If they don't upload one, it stays empty
    },
    coverPicture: {
      type: String,
      default: "",
    },
    isPrivate: {
      type: Boolean,
      default: false, // By default, profiles are public
    },
    followers: {
      type: Array,
      default: [], // Starts with 0 followers
    },
    followings: {
      type: Array,
      default: [], // Starts following 0 people
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    desc: {
      type: String,
      maxlength: 50,
    },
    city: {
      type: String,
      maxlength: 50,
    },
    from: {
      type: String,
      maxlength: 50,
    },
    library: {
      type: Array, 
      default: [] 
    },
  },
  { timestamps: true } // Automatically adds "createdAt" and "updatedAt"
);

module.exports = mongoose.model("User", userSchema);