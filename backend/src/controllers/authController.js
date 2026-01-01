// src/controllers/authController.js
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// REGISTER
const registerUser = async (req, res) => {
  try {
    // 1. Destructure data from the request body
    const { username, email, password } = req.body;

    // 2. Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 3. Generate a "Salt" and Hash the password
    // A salt is random data added to the password before hashing makes it harder to crack
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create a new user instance with the hashed password
    const newUser = new User({
      username: username,
      email: email,
      password: hashedPassword,
    });

    // 5. Save the user to MongoDB
    const user = await newUser.save();

    // 6. Respond to the client (we don't send the password back)
    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      message: "User registered successfully!",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};
// LOGIN
const loginUser = async (req, res) => {
  try {
    // 1. Find User
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json("User not found");

    // 2. Check Password
    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).json("Wrong password");

    // 3. GENERATE ACCESS TOKEN (The Wristband) <--- NEW PART
    // We put the user's ID inside the token so we know who it belongs to
    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin }, // Payload (Data inside token)
      process.env.JWT_SECRET,                  // Secret Key
      { expiresIn: "5d" }                      // Token expires in 5 days
    );

    // 4. Return user info AND the token
    // We separate the password from the rest of the data so we don't send it back
    const { password, ...otherDetails } = user._doc;

    res.status(200).json({ ...otherDetails, token }); // Send token to frontend
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports = { registerUser, loginUser };
