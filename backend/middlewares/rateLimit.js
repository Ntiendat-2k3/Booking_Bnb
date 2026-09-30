const rateLimit = require("express-rate-limit");
const { MemoryStore } = rateLimit;
const { getRedis, redisReady } = require("../utils/redis");

const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many login attempts, please try again later." },
});

const authRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many register attempts, please try again later." },
});

const authRefreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many requests, please slow down." },
});

const uploadMemoryStore = new MemoryStore();
const uploadStore = {
  init(options) { uploadMemoryStore.init(options); },
  async increment(key) {
    if (redisReady()) {
      try {
        const [hits, ttl] = await getRedis().eval(
          "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('PTTL',KEYS[1])}",
          { keys: [`rate:upload:${key}`], arguments: [String(10 * 60 * 1000)] },
        );
        return { totalHits: Number(hits), resetTime: new Date(Date.now() + Number(ttl)) };
      } catch (error) {
        console.error("[uploads] Redis rate limit lỗi:", error.name);
      }
    }
    return uploadMemoryStore.increment(key);
  },
  async decrement(key) {
    if (redisReady()) return getRedis().decr(`rate:upload:${key}`);
    return uploadMemoryStore.decrement(key);
  },
  async resetKey(key) {
    if (redisReady()) return getRedis().del(`rate:upload:${key}`);
    return uploadMemoryStore.resetKey(key);
  },
};

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  keyGenerator: (req) => String(req.user.user.id),
  store: uploadStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many uploads, please slow down." },
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { status: "error", message: "Too many password reset attempts" },
});
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { status: "error", message: "Too many contact requests" },
});

module.exports = { authLoginLimiter, authRegisterLimiter, authRefreshLimiter, uploadLimiter, passwordResetLimiter, contactLimiter };
