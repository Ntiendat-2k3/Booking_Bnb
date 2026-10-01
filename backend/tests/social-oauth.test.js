const test = require("node:test");
const assert = require("node:assert/strict");
const { generateKeyPairSync } = require("node:crypto");
const jwt = require("jsonwebtoken");
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
