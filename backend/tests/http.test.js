const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { once } = require("node:events");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { loadBackend, database } = require("./helpers");

async function serve(t, app) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}
function fakeRedis() {
  const data = new Map();
  const writes = [];
  const patterns = [];
  return {
    data, writes, patterns,
    get: async (key) => data.get(key) || null,
    incr: async (key) => { const value = Number(data.get(key) || 0) + 1; data.set(key, String(value)); return value; },
    eval: async (_script, { keys, arguments: args }) => {
      if ((data.get(keys[1]) || "0") !== args[0]) return null;
      writes.push(keys[0]); data.set(keys[0], args[1]); return "OK";
    },
    async *scanIterator({ MATCH }) {
      patterns.push(MATCH);
      const escaped = MATCH.replace(/[.+^${}()|[\]]/g, "\\$&").replace(/\\\?/g, "__QUESTION__").replace(/\*/g, ".*").replace(/\?/g, ".").replace(/__QUESTION__/g, "\\?");
      const regex = new RegExp(`^${escaped}$`);
      for (const key of [...data.keys()]) if (regex.test(key)) yield key;
    },
    del: async (keys) => keys.reduce((sum, key) => sum + Number(data.delete(key)), 0),
  };
}

test("JSON response chỉ ghi cache một lần; HIT giữ body và content type", async (t) => {
  const redis = fakeRedis();
  const { cache } = loadBackend("core/cache.js", {}, { "utils/redis.js": { getRedis: () => redis, redisReady: () => true } });
  const app = express();
  let calls = 0;
  app.get("/test", cache(), (_req, res) => { calls++; res.json({ data: { value: 1 } }); });
  const base = await serve(t, app);
  const first = await fetch(`${base}/test`);
  assert.equal(first.headers.get("x-cache"), "MISS");
  assert.equal((await first.json()).data.value, 1);
  const second = await fetch(`${base}/test`);
  assert.equal(second.headers.get("x-cache"), "HIT");
  assert.match(second.headers.get("content-type"), /application\/json/);
  assert.equal((await second.json()).data.value, 1);
  assert.equal(calls, 1);
  assert.equal(redis.writes.length, 1);
});

test("Invalidation có ID giữ detail khác và chặn response cũ đang xử lý ghi cache", async (t) => {
  const redis = fakeRedis();
  const api = loadBackend("core/cache.js", {}, { "utils/redis.js": { getRedis: () => redis, redisReady: () => true } });
  for (const url of ["/api/v1/listings", "/api/v1/listings?page=2", "/api/v1/listings/a", "/api/v1/listings/a/reviews", "/api/v1/listings/b"]) redis.data.set(`cache:GET:${url}`, "{}");
  await api.invalidateListings("a");
  assert.ok(redis.data.has("cache:GET:/api/v1/listings/b"));
  assert.equal(redis.data.has("cache:GET:/api/v1/listings?page=2"), false);
  let ready;
  const waiting = new Promise((resolve) => { ready = resolve; });
  let release;
  const app = express();
  app.get("/slow", api.cache(), async (_req, res) => {
    ready(); await new Promise((resolve) => { release = resolve; }); res.json({ old: true });
  });
  const base = await serve(t, app);
  const request = fetch(`${base}/slow`);
  await waiting;
  await api.invalidateListings("a");
  release();
  await (await request).json();
  assert.equal(redis.data.has("cache:GET:/slow"), false);
});

test("Redis lỗi và response 500 vẫn trả HTTP đúng, không lưu lỗi vào cache", async (t) => {
  const redis = fakeRedis();
  redis.get = async () => { throw new Error("Redis unavailable"); };
  const { cache } = loadBackend("core/cache.js", {}, { "utils/redis.js": { getRedis: () => redis, redisReady: () => true } });
  const app = express();
  app.get("/error", cache(), (_req, res) => res.status(500).json({ status: "error" }));
  const response = await fetch(`${await serve(t, app)}/error`);
  assert.equal(response.status, 500);
  assert.equal(redis.writes.length, 0);
});

test("Giới hạn upload dùng tài khoản và bộ đếm chung Redis", async (t) => {
  const counts = new Map();
  const redis = { eval: async (_script, { keys }) => {
    const count = (counts.get(keys[0]) || 0) + 1;
    counts.set(keys[0], count);
    return [count, 600000];
  } };
  const { uploadLimiter } = loadBackend("middlewares/rateLimit.js", {}, {
    "utils/redis.js": { getRedis: () => redis, redisReady: () => true },
  });
  const app = express();
  app.get("/upload", (req, _res, next) => { req.user = { user: { id: req.get("x-user") } }; next(); }, uploadLimiter, (_req, res) => res.sendStatus(204));
  const base = await serve(t, app);
  for (let index = 0; index < 30; index++) {
    assert.equal((await fetch(`${base}/upload`, { headers: { "x-user": "host-a" } })).status, 204);
  }
  assert.equal((await fetch(`${base}/upload`, { headers: { "x-user": "host-a" } })).status, 429);
  assert.equal((await fetch(`${base}/upload`, { headers: { "x-user": "host-b" } })).status, 204);
  assert.equal(counts.get("rate:upload:host-a"), 31);
});

test("Thay avatar lên lịch xóa ảnh cũ và xóa tệp tạm", async () => {
  const userId = "10000000-0000-4000-8000-000000000003";
  const folder = `booking_bnb/avatars/${userId}`;
  const filePath = path.join(os.tmpdir(), `booking-avatar-${Date.now()}`);
  await fs.writeFile(filePath, "image");
  const deleted = [];
  const controller = loadBackend("controllers/api/v1/account.controller.js", {}, {
    "services/account.service.js": {
      getMe: async () => ({ avatar_url: `https://res.cloudinary.com/demo/image/upload/v1/${folder}/old.jpg` }),
      setAvatarUrl: async (_id, url) => ({ id: userId, avatar_url: url }),
    },
    "services/cloudinary.service.js": { uploadFile: async (_file, publicId) => ({ public_id: publicId, secure_url: `https://res.cloudinary.com/demo/image/upload/v2/${publicId}.jpg` }) },
    "services/background_job.service.js": { enqueue: async (_type, payload) => { deleted.push(payload.public_id); } },
  }, { CLOUDINARY_CLOUD_NAME: "demo" });
  let status;
  let nextError;
  const res = { status(code) { status = code; return this; }, json(value) { return value; } };
  await controller.uploadAvatar({ user: { user: { id: userId } }, file: { path: filePath } }, res, (error) => { nextError = error; });
  assert.equal(nextError, undefined);
  assert.equal(status, 201);
  assert.deepEqual(deleted, [`${folder}/old`]);
  await assert.rejects(fs.stat(filePath), { code: "ENOENT" });
});

test("Validation HTTP từ chối ngày không tồn tại và loại field chủ sở hữu do client gửi", async (t) => {
  const validate = require("../middlewares/api/validation.middleware");
  const { createBookingSchema } = require("../requests/api/v1/booking.schema");
  const { imageSchema } = require("../requests/api/v1/listing.schema");
  const app = express(); app.use(express.json());
  app.post("/booking", validate(createBookingSchema), (req, res) => res.json(req.body));
  app.post("/image", validate(imageSchema), (req, res) => res.json(req.body));
  const base = await serve(t, app);
  const invalid = await fetch(`${base}/booking`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listing_id: "10000000-0000-4000-8000-000000000001", check_in: "2099-02-30", check_out: "2099-03-01" }) });
  assert.equal(invalid.status, 400);
  const valid = await fetch(`${base}/image`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ public_id: "ours", user_id: "other", url: "https://attacker" }) });
  assert.deepEqual(await valid.json(), { public_id: "ours" });
});

test("Schema chặn mật khẩu vượt 72 byte, giá âm, tọa độ thiếu cặp và page sai", () => {
  const { registerSchema } = require("../requests/api/v1/auth.schema");
  const { listingQuerySchema, createListingSchema } = require("../requests/api/v1/listing.schema");
  assert.ok(registerSchema.validate({ email: "a@example.com", full_name: "Test", password: "ệ".repeat(25) }).error);
  assert.ok(listingQuerySchema.validate({ lat: 10 }).error);
  assert.ok(listingQuerySchema.validate({ page: -1 }).error);
  assert.ok(createListingSchema.validate({ title: "Test", city: "HN", country: "VN", max_guests: 2, price_per_night: -1 }).error);
});

test("Webhook yêu cầu secret, raw body và chữ ký hợp lệ trước khi gọi service", async (t) => {
  let handled = 0;
  for (const [env, signature, body, status] of [
    [{}, "valid", "{}", 503],
    [{ STRIPE_WEBHOOK_SECRET: "secret" }, undefined, "{}", 400],
    [{ STRIPE_WEBHOOK_SECRET: "secret" }, "wrong", "{}", 400],
    [{ STRIPE_WEBHOOK_SECRET: "secret" }, "valid", "{}", 200],
  ]) {
    const controller = loadBackend("controllers/api/v1/payment.controller.js", {}, {
      "services/payment.service.js": { handleStripeWebhook: async () => { handled++; } },
      "config/stripe.js": { getStripe: () => ({ webhooks: { constructEvent: (raw, sig) => { assert.ok(Buffer.isBuffer(raw)); if (sig !== "valid") throw new Error("Bad signature"); return {}; } } }) },
    }, env);
    const app = express(); app.post("/webhook", express.raw({ type: "application/json" }), controller.stripeWebhook);
    app.use(require("../middlewares/error.middleware"));
    const response = await fetch(`${await serve(t, app)}/webhook`, { method: "POST", headers: { "content-type": "application/json", ...(signature ? { "stripe-signature": signature } : {}) }, body });
    assert.equal(response.status, status);
  }
  assert.equal(handled, 1);
});

test("Lỗi nội bộ được ẩn; token sai trả 401", async (t) => {
  const db = database();
  const auth = loadBackend("services/auth.service.js", db.models);
  await assert.rejects(auth.refresh("invalid.jwt"), { status: 401 });
  const app = express();
  app.get("/error", (_req, _res, next) => next(new Error("password=do-not-expose")));
  app.use(loadBackend("middlewares/error.middleware.js", db.models));
  const response = await fetch(`${await serve(t, app)}/error`);
  assert.equal(response.status, 500);
  assert.equal(JSON.stringify(await response.json()).includes("do-not-expose"), false);
});

test("App/routers khởi tạo được; CORS, 404 và validation hoạt động trước query DB", async (t) => {
  const db = database();
  const app = loadBackend("app.js", db.models, {
    "utils/redis.js": { connectRedis: async () => {}, getRedis: () => null, redisReady: () => false },
  }, { GOOGLE_CLIENT_ID: "test-client", GOOGLE_CLIENT_SECRET: "test-secret", GOOGLE_CALLBACK_URL: "http://localhost/callback", CORS_ORIGINS: "https://allowed.example" });
  const base = await serve(t, app);
  assert.equal((await fetch(`${base}/`)).status, 200);
  assert.equal((await fetch(`${base}/missing`)).status, 404);
  assert.equal((await fetch(`${base}/api/v1/listings?lat=10`)).status, 400);
  assert.equal((await fetch(`${base}/api/v1/listings/not-a-uuid`)).status, 400);
  const forbidden = await fetch(`${base}/`, { method: "OPTIONS", headers: { origin: "https://forbidden.example", "access-control-request-method": "GET" } });
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.headers.has("access-control-allow-origin"), false);
  const allowed = await fetch(`${base}/`, { method: "OPTIONS", headers: { origin: "https://allowed.example", "access-control-request-method": "GET" } });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://allowed.example");
  assert.equal(db.calls.length, 0);
});
