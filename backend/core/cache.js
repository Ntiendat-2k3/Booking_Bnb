const { getRedis, redisReady } = require("../utils/redis");
const DEFAULT_PREFIX = process.env.CACHE_PREFIX || "cache";

function buildCacheKey(req, { prefix = DEFAULT_PREFIX, varyByUser = false } = {}) {
  const url = req.originalUrl || req.url;
  const method = (req.method || "GET").toUpperCase();
  const userPart = varyByUser ? `:u:${req.user?.user?.id || "anon"}` : "";
  return `${prefix}:${method}:${url}${userPart}`;
}

async function invalidate(patterns = [], { prefix = DEFAULT_PREFIX } = {}) {
  const client = getRedis();
  if (!redisReady() || !client) return 0;
  let deleted = 0;
  // Tăng phiên bản trước khi xóa để response đang xử lý không ghi lại dữ liệu cũ sau invalidation.
  try { await client.incr(`${prefix}:revision`); }
  catch (error) { console.warn("[cache] Không thể tăng phiên bản:", error.name); }
  for (const pattern of Array.isArray(patterns) ? patterns : [patterns]) {
    if (!pattern) continue;
    const match = pattern.startsWith(`${prefix}:`) ? pattern : `${prefix}:${pattern}`;
    try {
      let batch = [];
      for await (const key of client.scanIterator({ MATCH: match, COUNT: 200 })) {
        batch.push(key);
        if (batch.length >= 100) { deleted += await client.del(batch); batch = []; }
      }
      if (batch.length) deleted += await client.del(batch);
    } catch (error) { console.warn("[cache] Xóa cache thất bại:", error.name); }
  }
  return deleted;
}

function cache(ttlSeconds = 60, opts = {}) {
  const options = { prefix: DEFAULT_PREFIX, varyByUser: false, onlyStatusCodes: [200], ...opts };
  return async function cacheMiddleware(req, res, next) {
    if (req.method !== "GET" || !Number.isInteger(ttlSeconds) || ttlSeconds < 1) return next();
    const client = getRedis();
    if (!redisReady() || !client) return next();
    const key = buildCacheKey(req, options);
    let revision;
    try {
      revision = await client.get(`${options.prefix}:revision`) || "0";
      const cached = await client.get(key);
      if (cached) {
        const payload = JSON.parse(cached);
        res.set("X-Cache", "HIT");
        res.set("Content-Type", payload.contentType || payload.headers?.["Content-Type"] || "application/json; charset=utf-8");
        return res.status(payload.statusCode || 200).send(payload.body);
      }
    } catch (error) { console.warn("[cache] Đọc cache thất bại:", error.name); }
    const originalSend = res.send.bind(res);
    let saved = false;
    async function saveToCache(body) {
      try {
        if (!options.onlyStatusCodes.includes(res.statusCode)) return;
        const raw = Buffer.isBuffer(body) ? body.toString("utf8") : body;
        if (Buffer.byteLength(raw, "utf8") > Number(process.env.CACHE_MAX_BYTES || 1048576)) return;
        if (revision === undefined) return;
        await client.eval("if (redis.call('GET', KEYS[2]) or '0') == ARGV[1] then return redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3]) end return nil", {
          keys: [key, `${options.prefix}:revision`],
          arguments: [revision, JSON.stringify({ statusCode: res.statusCode, body: raw, contentType: res.get("Content-Type") }), String(ttlSeconds)],
        });
      } catch (error) { console.warn("[cache] Ghi cache thất bại:", error.name); }
    }
    // Express json gọi send; chỉ lưu lần send chứa nội dung đã serialize.
    res.send = (body) => {
      res.set("X-Cache", "MISS");
      const result = originalSend(body);
      if (!saved && (typeof body === "string" || Buffer.isBuffer(body))) { saved = true; void saveToCache(body); }
      return result;
    };
    return next();
  };
}

function invalidateListings(listingId) {
  const patterns = listingId ? [
    "GET:/api/v1/listings", "GET:/api/v1/listings\\?*",
    `GET:/api/v1/listings/${listingId}`, `GET:/api/v1/listings/${listingId}\\?*`, `GET:/api/v1/listings/${listingId}/reviews*`,
  ] : ["GET:/api/v1/listings*"];
  return invalidate(patterns);
}

function invalidateAmenities() {
  return invalidate(["GET:/api/v1/amenities*", "GET:/api/v1/listings*"]);
}

function invalidateReviews(listingId) { return invalidateListings(listingId); }

module.exports = { cache, invalidate, buildCacheKey, invalidateListings, invalidateAmenities, invalidateReviews };
