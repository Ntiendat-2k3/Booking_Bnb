const { getRedis, redisReady } = require("../utils/redis");

const DEFAULT_PREFIX = process.env.CACHE_PREFIX || "cache";

function buildCacheKey(
  req,
  { prefix = DEFAULT_PREFIX, varyByUser = false } = {},
) {
  const url = req.originalUrl || req.url;
  const method = (req.method || "GET").toUpperCase();

  const userPart = varyByUser ? `:u:${req.user?.user?.id || "anon"}` : "";

  return `${prefix}:${method}:${url}${userPart}`;
}

async function invalidate(patterns = [], { prefix = DEFAULT_PREFIX } = {}) {
  const client = getRedis();
  if (!redisReady() || !client) return 0;

  let deleted = 0;
  const toPatterns = Array.isArray(patterns) ? patterns : [patterns];

  for (const p of toPatterns) {
    if (!p) continue;
    const match = p.startsWith(prefix + ":") ? p : `${prefix}:${p}`;

    try {
      // redis v4 supports async iterator for SCAN
      for await (const key of client.scanIterator({
        MATCH: match,
        COUNT: 200,
      })) {
        await client.del(key);
        deleted += 1;
      }
    } catch (e) {
      console.warn("[cache] invalidate failed:", e?.message || e);
    }
  }

  return deleted;
}

function cache(ttlSeconds = 60, opts = {}) {
  const options = {
    prefix: DEFAULT_PREFIX,
    varyByUser: false,
    onlyStatusCodes: [200],
    ...opts,
  };

  return async function cacheMiddleware(req, res, next) {
    // Cache GET only
    if ((req.method || "").toUpperCase() !== "GET") return next();

    const client = getRedis();
    if (!redisReady() || !client) return next();

    const key = buildCacheKey(req, options);

    // Try read
    try {
      const cached = await client.get(key);
      if (cached) {
        const payload = JSON.parse(cached);
        res.set("X-Cache", "HIT");
        if (payload?.headers && typeof payload.headers === "object") {
          for (const [h, v] of Object.entries(payload.headers)) {
            if (v !== undefined) res.set(h, String(v));
          }
        }
        return res.status(payload.statusCode || 200).send(payload.body);
      }
    } catch (e) {
      // If redis fails, just continue (no caching)
      console.warn("[cache] get failed:", e?.message || e);
    }

    // Hook response writers to save
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    async function saveToCache(body) {
      try {
        if (!options.onlyStatusCodes.includes(res.statusCode)) return;

        // Avoid caching very large payloads (defaults to 1MB)
        const maxBytes = Number(process.env.CACHE_MAX_BYTES || 1024 * 1024);
        const raw = typeof body === "string" ? body : JSON.stringify(body);
        if (Buffer.byteLength(raw, "utf8") > maxBytes) return;

        const payload = {
          statusCode: res.statusCode,
          // store as string to replay with res.send
          body: raw,
          // minimal headers that are safe to replay
          headers: {
            "Content-Type":
              res.get("Content-Type") || "application/json; charset=utf-8",
          },
        };

        await client.set(key, JSON.stringify(payload), { EX: ttlSeconds });
      } catch (e) {
        console.warn("[cache] set failed:", e?.message || e);
      }
    }

    res.json = (body) => {
      res.set("X-Cache", "MISS");
      saveToCache(body);
      return originalJson(body);
    };

    res.send = (body) => {
      res.set("X-Cache", "MISS");
      saveToCache(body);
      return originalSend(body);
    };

    return next();
  };
}

module.exports = {
  cache,
  invalidate,
  buildCacheKey,
};
