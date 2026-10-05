const test = require("node:test");
const assert = require("node:assert/strict");
const { loadBackend } = require("./helpers");

test("Challenge Passkey ràng buộc tài khoản và chỉ dùng một lần", async () => {
  const values = new Map();
  const redis = {
    async set(key, value) { values.set(key, value); },
    async getDel(key) { const value = values.get(key) || null; values.delete(key); return value; },
  };
  const service = loadBackend("services/passkey.service.js", {
    PasskeyCredential: { findAll: async () => [], findOne: async () => null },
    User: {},
  }, { "utils/redis.js": { getRedis: () => redis, redisReady: () => true } }, {
    FRONTEND_URL: "http://localhost:3001", PASSKEY_RP_ID: "localhost",
  });
  const user = { id: "01234567-89ab-4cde-8fab-0123456789ab", username: "guest", full_name: "Guest" };
  const registration = await service.registrationOptions(user);
  assert.equal(registration.options.rp.id, "localhost");
  await assert.rejects(service.verifyRegistration("another-user", registration.ceremonyId, {}, "Phone"), { status: 400 });
  await assert.rejects(service.verifyRegistration(user.id, registration.ceremonyId, {}, "Phone"), { status: 400 });
  const authentication = await service.authenticationOptions();
  await assert.rejects(service.verifyAuthentication(authentication.ceremonyId, { id: "unknown" }), { status: 401 });
  await assert.rejects(service.verifyAuthentication(authentication.ceremonyId, { id: "unknown" }), { status: 400 });
});
