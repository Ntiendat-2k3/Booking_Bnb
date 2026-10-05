/** Xác minh WebAuthn trên máy chủ và ràng buộc challenge một lần với cookie trình duyệt. */
const crypto = require("node:crypto");
const {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} = require("@simplewebauthn/server");
const { PasskeyCredential, User } = require("../models");
const { getRedis, redisReady } = require("../utils/redis");
const httpError = require("../utils/httpError");

const CHALLENGE_TTL_SECONDS = 300;

function relyingParty() {
  const origin = new URL(process.env.PASSKEY_EXPECTED_ORIGIN || process.env.FRONTEND_URL || "http://localhost:3001").origin;
  const rpID = process.env.PASSKEY_RP_ID || new URL(origin).hostname;
  if (new URL(origin).hostname !== rpID || (new URL(origin).protocol !== "https:" && rpID !== "localhost")) {
    throw httpError(503, "Passkey configuration is invalid");
  }
  return { origin, rpID };
}

function redis() {
  if (!redisReady()) throw httpError(503, "Passkey is temporarily unavailable");
  return getRedis();
}

function challengeKey(kind, id) {
  return `auth:passkey:${kind}:${id}`;
}

async function saveChallenge(kind, challenge, userId = null) {
  const id = crypto.randomBytes(32).toString("base64url");
  await redis().set(challengeKey(kind, id), JSON.stringify({ challenge, userId }), { EX: CHALLENGE_TTL_SECONDS });
  return id;
}

/** GETDEL bảo đảm một challenge không thể dùng lại, kể cả khi nhiều instance cùng nhận yêu cầu. */
async function takeChallenge(kind, id, userId = null) {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(id)) throw httpError(400, "Passkey challenge expired");
  const value = await redis().getDel(challengeKey(kind, id));
  if (!value) throw httpError(400, "Passkey challenge expired");
  const stored = JSON.parse(value);
  if (stored.userId !== userId) throw httpError(400, "Passkey challenge invalid");
  return stored.challenge;
}

async function registrationOptions(user) {
  const { rpID } = relyingParty();
  const credentials = await PasskeyCredential.findAll({ where: { user_id: user.id } });
  const options = await generateRegistrationOptions({
    rpName: "Booking BnB",
    rpID,
    userID: Buffer.from(user.id.replace(/-/g, ""), "hex"),
    userName: user.username || user.email,
    userDisplayName: user.full_name,
    attestationType: "none",
    excludeCredentials: credentials.map((item) => ({ id: item.credential_id, transports: item.transports })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  return { options, ceremonyId: await saveChallenge("register", options.challenge, user.id) };
}

async function verifyRegistration(userId, ceremonyId, response, name) {
  const challenge = await takeChallenge("register", ceremonyId, userId);
  const { origin, rpID } = relyingParty();
  let result;
  try {
    result = await verifyRegistrationResponse({ response, expectedChallenge: challenge,
      expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
  } catch {
    throw httpError(400, "Passkey verification failed");
  }
  if (!result.verified || !result.registrationInfo) throw httpError(400, "Passkey verification failed");
  const { credential, credentialDeviceType, credentialBackedUp } = result.registrationInfo;
  const passkey = await PasskeyCredential.create({
    user_id: userId,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey),
    counter: credential.counter,
    transports: Array.isArray(response?.response?.transports) ? response.response.transports : [],
    device_type: credentialDeviceType,
    backed_up: credentialBackedUp,
    name: typeof name === "string" && name.trim() ? name.trim().slice(0, 80) : "Passkey",
  });
  return { id: passkey.id, name: passkey.name };
}

async function authenticationOptions() {
  const { rpID } = relyingParty();
  const options = await generateAuthenticationOptions({ rpID, userVerification: "required", allowCredentials: [] });
  return { options, ceremonyId: await saveChallenge("login", options.challenge) };
}

async function verifyAuthentication(ceremonyId, response) {
  const challenge = await takeChallenge("login", ceremonyId);
  const passkey = typeof response?.id === "string"
    ? await PasskeyCredential.findOne({ where: { credential_id: response.id } }) : null;
  if (!passkey) throw httpError(401, "Passkey authentication failed");
  const { origin, rpID } = relyingParty();
  let result;
  try {
    result = await verifyAuthenticationResponse({
      response, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID,
      requireUserVerification: true,
      credential: { id: passkey.credential_id, publicKey: new Uint8Array(passkey.public_key),
        counter: Number(passkey.counter), transports: passkey.transports },
    });
  } catch {
    throw httpError(401, "Passkey authentication failed");
  }
  if (!result.verified) throw httpError(401, "Passkey authentication failed");
  const user = await User.findByPk(passkey.user_id);
  if (!user || user.status !== "active") throw httpError(401, "Passkey authentication failed");
  const [updated] = await PasskeyCredential.update({
    counter: result.authenticationInfo.newCounter, last_used_at: new Date(),
  }, { where: { id: passkey.id, counter: passkey.counter } });
  if (updated !== 1) throw httpError(401, "Passkey authentication failed");
  return user;
}

async function list(userId) {
  const records = await PasskeyCredential.findAll({ where: { user_id: userId }, order: [["created_at", "DESC"]] });
  return records.map(({ id, name, created_at, last_used_at }) => ({ id, name, created_at, last_used_at }));
}

async function remove(user, id) {
  const passkey = await PasskeyCredential.findOne({ where: { id, user_id: user.id } });
  if (!passkey) throw httpError(404, "Passkey not found");
  if (user.provider === "apple" && await PasskeyCredential.count({ where: { user_id: user.id } }) <= 1) {
    throw httpError(409, "Cannot remove the last sign-in method");
  }
  await passkey.destroy();
}

module.exports = { registrationOptions, verifyRegistration, authenticationOptions, verifyAuthentication, list, remove };
