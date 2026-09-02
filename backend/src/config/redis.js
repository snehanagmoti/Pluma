const Redis = require("ioredis");

// Redis is an optional accelerator. A developer should be able to run Pluma with
// only MongoDB, and a missing Redis instance must not create retry noise or hold
// the Node process open.
const disabledClient = {
  status: "disabled",
  get: async () => null,
  set: async () => null,
  del: async () => 0,
  incr: async () => 0,
  expire: async () => 0,
  quit: async () => undefined,
};

if (!process.env.REDIS_URL) {
  module.exports = disabledClient;
} else {
  const redisClient = new Redis(process.env.REDIS_URL, {
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  redisClient.on("error", err => {
    console.warn("Redis unavailable; using in-process fallbacks:", err.message);
  });
  redisClient.on("connect", () => console.log("Connected to Redis cache"));
  redisClient.connect().catch(() => undefined);
  module.exports = redisClient;
}
