const redisClient = require('../config/redis');
const windows = new Map();

const pruneWindows = () => {
  const now = Date.now();
  for (const [key, value] of windows.entries()) {
    if (value.resetAt <= now) windows.delete(key);
  }
};

// Basic fixed-window rate limiter using Redis
const createRateLimiter = (limit, windowSeconds = 60) => {
  return async (req, res, next) => {
    try {
      // Use IP as identifier if not logged in, otherwise use user ID
      const identifier = req.user ? req.user.id : (req.headers['x-forwarded-for'] || req.socket.remoteAddress);
      
      const key = `ratelimit:${req.baseUrl || req.path}:${identifier}`;

      if (redisClient.status !== 'ready') {
        if (windows.size > 10000) pruneWindows();
        const now = Date.now();
        const currentWindow = windows.get(key);
        const entry = !currentWindow || currentWindow.resetAt <= now
          ? { count: 1, resetAt: now + windowSeconds * 1000 }
          : { ...currentWindow, count: currentWindow.count + 1 };
        windows.set(key, entry);
        res.setHeader("RateLimit-Limit", limit);
        res.setHeader("RateLimit-Remaining", Math.max(0, limit - entry.count));
        if (entry.count > limit) {
          const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
          res.setHeader("Retry-After", retryAfter);
          return res.status(429).json({ message: "Too many requests. Please try again later.", retryAfter });
        }
        return next();
      }
      
      // Increment request count
      const current = await redisClient.incr(key);
      
      if (current === 1) {
        // First request in the window, set expiry
        await redisClient.expire(key, windowSeconds);
      }
      
      if (current > limit) {
        return res.status(429).json({ 
          message: "Too many requests. Please try again later.",
          retryAfter: windowSeconds 
        });
      }
      
      next();
    } catch (err) {
      console.error("Rate limiter error:", err);
      // Failsafe: if rate limiter fails, allow the request to proceed
      next();
    }
  };
};

module.exports = createRateLimiter;
