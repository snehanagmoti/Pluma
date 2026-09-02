const express = require('express');
const cors = require('cors');
require('dotenv').config();

const bookRoute = require("./routes/books");
const userRoute = require("./routes/users");
const authRoute = require("./routes/auth");
const aiRoute = require("./routes/ai");
const groupRoute = require("./routes/groups");
const socialRoute = require("./routes/social");
const messageRoute = require("./routes/messages");
const notificationRoute = require("./routes/notifications");
const catalogRoute = require("./routes/catalog");
const libraryRoute = require("./routes/library");
const readingRoute = require("./routes/reading");
const recommendationRoute = require("./routes/recommendations");
const connectDB = require('./config/db');
const redisClient = require('./config/redis');
const createRateLimiter = require('./middleware/rateLimiter');
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.set("trust proxy", 1);
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map(value => value.trim().replace(/\/$/, ""))
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) return callback(null, true);
    return callback(new Error("Origin is not allowed"));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), payment=()");
  next();
});

// Rate limiting
app.use("/api", createRateLimiter(100, 60)); // Global: 100 requests per minute

// Routes
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/books", bookRoute);
app.use("/api/ai", aiRoute);
app.use("/api/groups", groupRoute);
app.use("/api/social", socialRoute);
app.use("/api/messages", messageRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/catalog", catalogRoute);
app.use("/api/library", libraryRoute);
app.use("/api/reading", readingRoute);
app.use("/api/recommendations", recommendationRoute);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Pluma API is running' });
});
app.get("/health/live", (req, res) => res.status(200).json({ status: "ok" }));
app.get("/health/ready", (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({ status: databaseReady ? "ready" : "not-ready", database: databaseReady ? "connected" : "disconnected", cache: redisClient.status });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Start Server
let server;
const start = async () => {
  await connectDB();
  server = app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
  return server;
};

const shutdown = async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (redisClient.status === "ready") await redisClient.quit().catch(() => undefined);
  await mongoose.connection.close().catch(() => undefined);
};

if (require.main === module) {
  start();
  process.on("SIGTERM", () => shutdown().finally(() => process.exit(0)));
  process.on("SIGINT", () => shutdown().finally(() => process.exit(0)));
}

module.exports = { app, start, shutdown };
