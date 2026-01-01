const express = require('express');
const cors = require('cors');
require('dotenv').config();
//console.log("My Connection String is:", process.env.MONGO_URI); // <--- Add this line to debug
const bookRoute = require("./routes/books");
//const userRoutes = require('./routes/userRoutes');
const userRoute = require("./routes/users");
const connectDB = require('./config/db');
const authRoute = require("./routes/auth"); // <--- NEW: Import the route
connectDB();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Allows us to parse JSON bodies

// This says: "Any URL starting with /api/users goes to userRoutes"
//app.use('/api/users', userRoutes);
// Basic Test Route
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/books", bookRoute);
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});