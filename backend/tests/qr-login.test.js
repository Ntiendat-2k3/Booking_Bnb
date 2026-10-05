const test = require("node:test");
const assert = require("node:assert/strict");
const { loadBackend } = require("./helpers");

function setup() {
  const values = new Map();
  const redis = {
    async set(key, value) { values.set(key, value); },
    async get(key) { return values.get(key) || null; },
    async eval(script, { keys, arguments: args }) {
      const raw = values.get(keys[0]);
      if (!raw) return script.includes("return nil") ? null : 0;
      const session = JSON.parse(raw);
      if (script.includes("changed = true")) {
        if (session.codeHash !== args[0]) return null;
        if (session.state === "created") {
          session.state = "scanned"; session.scanHash = args[1];
          values.set(keys[0], JSON.stringify(session));
          return JSON.stringify({ session, changed: true });
        }
        return session.state === "scanned" && session.scanHash === args[1]
          ? JSON.stringify({ session, changed: false }) : null;
      }
      if (script.includes("session.state = 'confirmed'")) {
        if (session.state !== "scanned" || session.codeHash !== args[0] || session.scanHash !== args[1]) return 0;
        session.state = "confirmed"; session.userId = args[2];
        values.set(keys[0], JSON.stringify(session));
        return 1;
      }
      if (script.includes("return session.userId")) {
        if (session.state !== "confirmed" || session.bindingHash !== args[0]) return null;
        session.state = "consumed";
        values.set(keys[0], JSON.stringify(session));
        return session.userId;
      }
      if (script.includes("session.scanHash ~= ARGV[2]")) {
        if (session.state !== "scanned" || session.codeHash !== args[0] || session.scanHash !== args[1]) return 0;
      } else if (session.bindingHash !== args[0] || ["consumed", "cancelled"].includes(session.state)) return 0;
      session.state = "cancelled";
      values.set(keys[0], JSON.stringify(session));
      return 1;
    },
  };
  const qr = loadBackend("services/qr_login.service.js", {}, {
    "utils/redis.js": { getRedis: () => redis, redisReady: () => true },
  }, { FRONTEND_URL: "http://localhost:3001" });
  return { qr, values };
}

test("Quét QR không cấp phiên; chỉ mobile đã quét xác nhận và đúng desktop đổi được đúng một lần", async () => {
  const { qr } = setup();
  const started = await qr.start("Mozilla/5.0 (Windows NT 10.0) Chrome/120");
  const code = new URL(started.url).searchParams.get("code");
  const inspected = await qr.inspect(code);
  assert.equal(inspected.device.browser, "Chrome");
  assert.equal((await qr.desktopStatus(started.id, started.binding)).state, "scanned");
  assert.equal((await qr.inspect(code, inspected.scanCookie)).changed, false);
  await assert.rejects(qr.inspect(code), { status: 409 });
  await assert.rejects(qr.complete(started.id, started.binding), { status: 409 });
  await assert.rejects(qr.approve(code, "user-1", null), { status: 401 });
  await qr.approve(code, "user-1", inspected.scanCookie);
  assert.equal((await qr.desktopStatus(started.id, started.binding)).state, "confirmed");
  await assert.rejects(qr.complete(started.id, "x".repeat(43)), { status: 409 });
  assert.equal((await qr.complete(started.id, started.binding)).userId, "user-1");
  assert.equal((await qr.desktopStatus(started.id, started.binding)).state, "consumed");
  await assert.rejects(qr.complete(started.id, started.binding), { status: 409 });
  await assert.rejects(qr.approve(code, "user-2", inspected.scanCookie), { status: 409 });
});

test("Mobile đã quét có thể hủy, trình duyệt khác không thể xác nhận hoặc hủy", async () => {
  const { qr } = setup();
  const started = await qr.start("Firefox/120");
  const code = new URL(started.url).searchParams.get("code");
  const scanned = await qr.inspect(code);
  await assert.rejects(qr.cancelMobile(code, `${started.id}.${"x".repeat(43)}`), { status: 409 });
  await qr.cancelMobile(code, scanned.scanCookie);
  assert.equal((await qr.desktopStatus(started.id, started.binding)).state, "cancelled");
  await assert.rejects(qr.approve(code, "user-1", scanned.scanCookie), { status: 409 });
});

test("Hai tab desktop giữ binding riêng và hủy tab này không ảnh hưởng tab kia", async () => {
  const { qr } = setup();
  const first = await qr.start("Chrome");
  const second = await qr.start("Chrome");
  assert.notEqual(qr.desktopCookieName(first.id), qr.desktopCookieName(second.id));
  await qr.cancel(first.id, first.binding);
  assert.equal((await qr.desktopStatus(first.id, first.binding)).state, "cancelled");
  assert.equal((await qr.desktopStatus(second.id, second.binding)).state, "created");
});

test("Môi trường production không tạo QR trỏ tới HTTP", async () => {
  const qr = loadBackend("services/qr_login.service.js", {}, {
    "utils/redis.js": { getRedis: () => null, redisReady: () => false },
  }, { NODE_ENV: "production", FRONTEND_URL: "http://example.com" });
  await assert.rejects(qr.start("Chrome"), { status: 503 });
});

test("Vé socket chỉ xem trạng thái QR đang sống; mất Redis TTL thì hết hạn", async () => {
  const { qr, values } = setup();
  const started = await qr.start("Chrome");
  assert.equal(await qr.authorizeSocket(started.id, started.socketTicket), true);
  assert.equal(await qr.authorizeSocket(started.id, "x".repeat(43)), false);
  values.delete(`auth:qr:session:${started.id}`);
  assert.equal((await qr.desktopStatus(started.id, started.binding)).state, "expired");
  assert.equal(await qr.authorizeSocket(started.id, started.socketTicket), false);
});
