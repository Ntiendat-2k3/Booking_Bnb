const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { loadBackend, database } = require("./helpers");

const user = { id: "10000000-0000-4000-8000-000000000001", email: "guest@example.com",
  role: "guest", provider: "local", status: "active" };

test("Refresh giữ session ID; thu hồi từng thiết bị không ảnh hưởng thiết bị khác", async () => {
  const db = database({ User: [user] });
  const auth = loadBackend("services/auth.service.js", db.models);
  const mobile = await auth.issueTokens(user, { userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/120" });
  const desktop = await auth.issueTokens(user, { userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/120" });
  const mobileId = jwt.verify(mobile.accessToken, "test-secret-only").sid;
  const desktopId = jwt.verify(desktop.accessToken, "test-secret-only").sid;
  assert.notEqual(mobileId, desktopId);
  const rotated = await auth.refresh(mobile.refreshToken);
  assert.equal(jwt.verify(rotated.accessToken, "test-secret-only").sid, mobileId);
  const before = await auth.listSessions(user.id, mobileId);
  assert.equal(before.length, 2);
  assert.equal(before.find((row) => row.current).os, "Android");
  assert.equal(before.find((row) => row.id === desktopId).os, "Windows");
  assert.ok(before.every((row) => !("token_hash" in row) && !("user_agent" in row)));

  await auth.revokeSession(user.id, desktopId);
  await assert.rejects(auth.refresh(desktop.refreshToken), { status: 401 });
  assert.deepEqual((await auth.listSessions(user.id, mobileId)).map((row) => row.id), [mobileId]);
  assert.equal(await auth.sessionIdForRefresh(rotated.refreshToken, user.id), mobileId);
  assert.equal(await auth.sessionIdForRefresh(desktop.refreshToken, user.id), null);
  const another = await auth.issueTokens(user, { userAgent: "Firefox/120" });
  const anotherId = jwt.verify(another.accessToken, "test-secret-only").sid;
  await auth.revokeOtherSessions(user.id, mobileId);
  assert.deepEqual((await auth.listSessions(user.id, mobileId)).map((row) => row.id), [mobileId]);
  assert.equal(await auth.sessionIdForRefresh(another.refreshToken, user.id), null);
  assert.notEqual(anotherId, mobileId);
});

test("Thu hồi thiết bị làm access token của thiết bị đó vô hiệu ngay", async () => {
  const db = database({ User: [user] });
  const auth = loadBackend("services/auth.service.js", db.models);
  const middleware = loadBackend("middlewares/api/auth.middleware.js", db.models);
  const tokens = await auth.issueTokens(user);
  const sid = jwt.verify(tokens.accessToken, "test-secret-only").sid;
  const req = { cookies: {}, get: (name) => name === "Authorization" ? `Bearer ${tokens.accessToken}` : "" };
  function response() {
    return { statusCode: 200, status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; } };
  }
  const first = response();
  await middleware(req, first, () => { first.next = true; });
  assert.equal(first.next, true);
  await auth.revokeSession(user.id, sid);
  const second = response();
  await middleware(req, second, () => { second.next = true; });
  assert.equal(second.statusCode, 401);
  assert.notEqual(second.next, true);
});
