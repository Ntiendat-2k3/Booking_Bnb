const test = require("node:test");
const assert = require("node:assert/strict");
const { createHmac, generateKeyPairSync } = require("node:crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const express = require("express");
const cookieParser = require("cookie-parser");
const { once } = require("node:events");
const { Passport } = require("passport");
const passportGlobal = require("passport");
const socialOauth = require("../services/social_oauth.service");
const { loadBackend, database } = require("./helpers");

test("Apple chỉ chấp nhận ID token có chữ ký, audience và nonce hợp lệ", async (t) => {
  const clientKey = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey;
  const appleKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const otherKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...appleKeys.publicKey.export({ format: "jwk" }), kid: "apple-test" };
  const config = { clientId: "booking.test", teamId: "TEAM123", keyId: "KEY123",
    privateKey: clientKey.export({ format: "pem", type: "pkcs8" }), redirectUri: "https://api.example.com/apple/callback" };
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });

  let tokenNonce = "expected-nonce";
  let tokenAudience = "booking.test";
  let signingKey = appleKeys.privateKey;
  global.fetch = async (url) => {
    if (url === "https://appleid.apple.com/auth/token") {
      return { ok: true, json: async () => ({ id_token: jwt.sign({ sub: "apple-user", email: "user@example.com",
        email_verified: "true", nonce: tokenNonce }, signingKey,
      { algorithm: "RS256", keyid: "apple-test", issuer: "https://appleid.apple.com",
        audience: tokenAudience, expiresIn: "5m" }) }) };
    }
    if (url === "https://appleid.apple.com/auth/keys") return { ok: true, json: async () => ({ keys: [jwk] }) };
    throw new Error(`Unexpected URL: ${url}`);
  };

  const profile = await socialOauth.appleProfile("code", "expected-nonce", config, JSON.stringify({
    name: { firstName: "Alex", lastName: "Le" },
  }));
  assert.deepEqual(profile, { provider: "apple", provider_id: "apple-user", email: "user@example.com",
    full_name: "Alex Le", avatar_url: null });

  tokenNonce = "different-nonce";
  await assert.rejects(socialOauth.appleProfile("code", "expected-nonce", config), /Invalid Apple account data/);
  tokenNonce = "expected-nonce";
  tokenAudience = "another-service";
  await assert.rejects(socialOauth.appleProfile("code", "expected-nonce", config), /jwt audience invalid/);
  tokenAudience = "booking.test";
  signingKey = otherKeys.privateKey;
  await assert.rejects(socialOauth.appleProfile("code", "expected-nonce", config), /invalid signature/);
});

test("Facebook lấy hồ sơ bằng access token được đổi từ authorization code", async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/oauth/access_token") {
      assert.equal(parsed.searchParams.get("code"), "authorization-code");
      assert.equal(parsed.searchParams.get("client_secret"), "app-secret");
      return { ok: true, json: async () => ({ access_token: "verified-access-token" }) };
    }
    assert.equal(parsed.pathname, "/me");
    assert.equal(parsed.searchParams.get("access_token"), "verified-access-token");
    return { ok: true, json: async () => ({ id: "facebook-user", name: "Alex Le",
      email: "user@example.com", picture: { data: { url: "https://example.com/avatar.jpg" } } }) };
  };

  const profile = await socialOauth.facebookProfile("authorization-code", {
    clientId: "app-id", clientSecret: "app-secret", redirectUri: "https://api.example.com/facebook/callback",
  });
  assert.equal(profile.provider_id, "facebook-user");
  assert.equal(profile.email, "user@example.com");
});

test("Tài khoản xã hội chỉ tái sử dụng đúng provider ID và không ghép email với phương thức khác", async () => {
  const db = database({ User: [{ id: "local-user", email: "used@example.com", provider: "local", status: "active" }] });
  const service = loadBackend("services/auth.service.js", db.models);
  await assert.rejects(service.findOrCreateSocialUser({ provider: "facebook", provider_id: "fb-1",
    email: "used@example.com", full_name: "Alex" }), { status: 409 });
  const first = await service.findOrCreateSocialUser({ provider: "facebook", provider_id: "fb-1",
    email: "new@example.com", full_name: "Alex" });
  const second = await service.findOrCreateSocialUser({ provider: "facebook", provider_id: "fb-1",
    email: "new@example.com", full_name: "Alex" });
  assert.equal(first.id, second.id);
  assert.equal(db.rows("User").length, 2);
  await assert.rejects(service.findOrCreateSocialUser({ provider: "apple", provider_id: "apple-1",
    email: "new@example.com", full_name: "Alex" }), { status: 409 });
});

test("Google chỉ liên kết email đã xác minh sau khi xác nhận mật khẩu và giữ nguyên tài khoản", async () => {
  const password_hash = await bcrypt.hash("existing-password", 4);
  const db = database({ User: [{ id: "local-user", email: "Used@Example.com", username: "existing_user",
    password_hash, provider: "local", provider_id: null, google_id: null, status: "active", role: "guest" }] });
  const service = loadBackend("services/auth.service.js", db.models);
  const profile = { provider: "google", provider_id: "google-sub-1", email: "used@example.com",
    email_verified: true, full_name: "Existing User" };

  await assert.rejects(service.registerLocal({ email: "USED@example.com", username: "other_user",
    password: "password123", full_name: "Another User" }), { status: 409 });

  await assert.rejects(service.findOrCreateSocialUser({ ...profile, email_verified: false }), { status: 403 });
  await assert.rejects(service.findOrCreateSocialUser(profile), (error) => {
    assert.equal(error.code, "GOOGLE_LINK_REQUIRED");
    assert.equal(error.googleLink.email, "Used@Example.com");
    return true;
  });
  await assert.rejects(service.linkGoogleAccount({ googleId: "google-sub-1", email: "used@example.com",
    identifier: "existing_user", password: "wrong-password" }), { status: 401 });
  assert.equal(db.rows("User")[0].google_id, null);

  const linked = await service.linkGoogleAccount({ googleId: "google-sub-1", email: "Used@Example.com",
    identifier: "USED@example.com", password: "existing-password" });
  assert.equal(linked.user.id, "local-user");
  assert.equal(linked.user.username, "existing_user");
  assert.equal(db.rows("User").length, 1);
  assert.equal(db.rows("User")[0].password_hash, password_hash);
  assert.equal((await service.findOrCreateSocialUser(profile)).id, "local-user");
  await assert.rejects(service.linkGoogleAccount({ googleId: "google-sub-2", email: "Used@Example.com",
    identifier: "used@example.com", password: "existing-password" }), { status: 409 });
});

test("Google mới tạo một tài khoản và đăng nhập lại bằng cùng Google ID", async () => {
  const db = database();
  const service = loadBackend("services/auth.service.js", db.models);
  const profile = { provider: "google", provider_id: "google-sub-new", email: "new@example.com",
    email_verified: true, full_name: "New User" };
  const first = await service.findOrCreateSocialUser(profile);
  const second = await service.findOrCreateSocialUser(profile);
  assert.equal(first.id, second.id);
  assert.equal(db.rows("User").length, 1);
  assert.equal(first.google_id, "google-sub-new");
  assert.ok(first.username.startsWith("user_"));
});

test("Liên kết Google rollback nếu không thể cấp phiên đăng nhập", async () => {
  const db = database({ User: [{ id: "local-user", email: "used@example.com", username: "existing_user",
    password_hash: await bcrypt.hash("existing-password", 4), provider: "local", google_id: null,
    status: "active", role: "guest" }] });
  const service = loadBackend("services/auth.service.js", db.models);
  db.failNextWrite("RefreshToken");
  await assert.rejects(service.linkGoogleAccount({ googleId: "google-sub-1", email: "used@example.com",
    identifier: "existing_user", password: "existing-password" }));
  assert.equal(db.rows("User")[0].google_id, null);
});

test("Google không liên kết tài khoản đã bị khóa", async () => {
  const db = database({ User: [{ id: "blocked-user", email: "blocked@example.com", username: "blocked_user",
    password_hash: await bcrypt.hash("existing-password", 4), provider: "local", google_id: null,
    status: "blocked", role: "guest" }] });
  const service = loadBackend("services/auth.service.js", db.models);
  await assert.rejects(service.findOrCreateSocialUser({ provider: "google", provider_id: "google-sub-1",
    email: "blocked@example.com", email_verified: true, full_name: "Blocked User" }), { status: 403 });
  await assert.rejects(service.linkGoogleAccount({ googleId: "google-sub-1", email: "blocked@example.com",
    identifier: "blocked_user", password: "existing-password" }), { status: 403 });
  assert.equal(db.rows("User")[0].google_id, null);
});

test("Mật khẩu local nhận username hoặc email kể cả khi đã liên kết Google", async (t) => {
  const db = database({ User: [{ id: "local-user", email: "used@example.com", username: "existing_user",
    password_hash: await bcrypt.hash("existing-password", 4), provider: "local", google_id: "google-sub-1", status: "active" }] });
  const strategy = loadBackend("passports/passport.local.js", db.models);
  const passport = new Passport();
  passport.use("local", strategy);
  const app = express();
  app.use(express.json(), passport.initialize());
  app.post("/login", (req, res, next) => passport.authenticate("local", { session: false }, (error, user) => {
    if (error) return next(error);
    return res.status(user ? 200 : 401).json({ id: user?.id || null });
  })(req, res, next));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}/login`;
  for (const identifier of ["existing_user", "USED@example.com"]) {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: identifier, password: "existing-password" }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).id, "local-user");
  }
  const wrong = await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "existing_user", password: "wrong-password" }) });
  assert.equal(wrong.status, 401);
});

test("Endpoint liên kết Google yêu cầu phiên ngắn hạn, CSRF và mật khẩu tài khoản cũ", async (t) => {
  const db = database({ User: [{ id: "local-user", email: "used@example.com", username: "existing_user",
    password_hash: await bcrypt.hash("existing-password", 4), provider: "local", google_id: null,
    status: "active", role: "guest" }] });
  const controller = loadBackend("controllers/api/v1/auth.controller.js", db.models);
  const validate = require("../middlewares/api/validation.middleware");
  const csrf = require("../middlewares/csrf.middleware");
  const { googleLinkSchema } = require("../requests/api/v1/auth.schema");
  const app = express();
  const previousGoogle = passportGlobal._strategy("google");
  const googleStrategy = new passportGlobal.Strategy();
  googleStrategy.name = "google";
  googleStrategy.authenticate = function () {
    this.fail({ googleLink: { googleId: "google-sub-1", email: "used@example.com" } });
  };
  passportGlobal.use("google", googleStrategy);
  t.after(() => { if (previousGoogle) passportGlobal.use("google", previousGoogle); else delete passportGlobal._strategies.google; });
  app.use(express.json(), cookieParser(), passportGlobal.initialize());
  app.get("/api/v1/auth/google/callback", controller.googleCallback);
  app.post("/api/v1/auth/google/link", csrf, validate(googleLinkSchema), controller.googleLink);
  app.use(loadBackend("middlewares/error.middleware.js", db.models));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const url = `${base}/api/v1/auth/google/link`;
  const redirect = await fetch(`${base}/api/v1/auth/google/callback`, { redirect: "manual" });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), "http://localhost:3001/login?google_link=1");
  const token = redirect.headers.get("set-cookie").match(/google_link=([^;]+)/)?.[1];
  assert.ok(token);
  const key = createHmac("sha256", "test-secret-only").update("google-link").digest();
  assert.equal(jwt.verify(token, key, { audience: "google-link" }).googleId, "google-sub-1");
  const request = (cookie, csrfHeader, password) => fetch(url, { method: "POST",
    headers: { "content-type": "application/json", cookie: `google_link=${cookie}; csrf_token=csrf-value`,
      ...(csrfHeader ? { "x-csrf-token": csrfHeader } : {}) },
    body: JSON.stringify({ email: "existing_user", password }) });

  assert.equal((await request(token, null, "existing-password")).status, 403);
  assert.equal((await request("forged", "csrf-value", "existing-password")).status, 401);
  assert.equal((await request(token, "csrf-value", "wrong-password")).status, 401);
  assert.equal(db.rows("User")[0].google_id, null);
  const linked = await request(token, "csrf-value", "existing-password");
  assert.equal(linked.status, 200);
  assert.equal((await linked.json()).data.user.id, "local-user");
  assert.equal(db.rows("User")[0].google_id, "google-sub-1");
  assert.match(linked.headers.get("set-cookie"), /refresh_token=/);
});

test("Username là duy nhất khi đăng ký và có thể đổi trong hồ sơ", async () => {
  const { registerSchema, loginSchema } = require("../requests/api/v1/auth.schema");
  assert.equal(registerSchema.validate({ email: "new@example.com", username: "New_User", password: "password123",
    full_name: "New User" }).value.username, "new_user");
  assert.ok(registerSchema.validate({ email: "new@example.com", username: "bad name", password: "password123",
    full_name: "New User" }).error);
  assert.equal(loginSchema.validate({ email: "existing_user", password: "password123" }).error, undefined);
  const db = database({ User: [
    { id: "user-a", email: "a@example.com", username: "user_a", full_name: "User A", status: "active" },
    { id: "user-b", email: "b@example.com", username: "user_b", full_name: "User B", status: "active" },
  ] });
  const auth = loadBackend("services/auth.service.js", db.models);
  const account = loadBackend("services/account.service.js", db.models,
    { "core/cache.js": { invalidateListings: async () => {} } });
  await assert.rejects(auth.registerLocal({ email: "new@example.com", username: "user_a",
    password: "password123", full_name: "New User" }), { status: 409 });
  await assert.rejects(account.updateProfile("user-a", { full_name: "User A", username: "user_b" }), { status: 409 });
  const updated = await account.updateProfile("user-a", { full_name: "User A", username: "new_name" });
  assert.equal(updated.username, "new_name");
  assert.equal(db.rows("User").find((user) => user.id === "user-a").username, "new_name");
});
