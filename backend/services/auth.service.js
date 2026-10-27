const bcrypt = require("bcrypt");
const { User, sequelize, Sequelize } = require("../models/index");
const crypto = require("crypto");
const { enqueue } = require("./background_job.service");
const emails = require("../templates/emails");
const httpError = require("../utils/httpError");
const UserRepository = require("../repositories/user.repository");
const RefreshTokenRepository = require("../repositories/refresh-token.repository");
const { createAccessToken, createRefreshToken, decodeToken } = require("../utils/jwt");
const { sha256 } = require("../utils/crypto");
const { parseExpiryToMs } = require("../utils/cookies");
const { safeDevice } = require("../utils/device");

const userRepo = new UserRepository();
const refreshRepo = new RefreshTokenRepository();
const REGISTRATION_CODE_TTL_MS = 10 * 60_000;
const REGISTRATION_RESEND_WAIT_MS = 60_000;
const REGISTRATION_MAX_ATTEMPTS = 5;

/** Băm mã trên bản ghi tài khoản bằng khóa máy chủ để tránh dò ngoại tuyến từ bảng users. */
function registrationCodeHash(email, code) {
  return crypto.createHmac("sha256", process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET)
    .update(`registration:${email.toLowerCase()}:${code}`).digest("hex");
}

function refreshExpiresAt() {
  const exp = process.env.JWT_REFRESH_TOKEN_EXPIRES || "30d";
  const ms = parseExpiryToMs(exp, 30 * 86_400_000);
  return new Date(Date.now() + ms);
}

function generatedUsername() {
  return `user_${crypto.randomUUID().replace(/-/g, "")}`;
}

function sanitizeUser(user) {
  if (!user) return null;
  const plain = user.toJSON ? user.toJSON() : user;
  const fields = ["id", "email", "username", "full_name", "phone", "avatar_url", "about", "location", "role", "status", "provider", "provider_id", "created_at", "updated_at"];
  return Object.fromEntries(fields.filter((field) => field in plain).map((field) => [field, plain[field]]));
}

module.exports = {
  registerLocal: async ({ email, username, password, full_name }) => {
    if (!email || !password || !full_name) {
      const err = new Error("Email, password, full_name are required");
      err.status = 400;
      throw err;
    }

    email = email.trim().toLowerCase();
    const exists = await userRepo.findByEmail(email);
    if (exists) {
      const err = new Error(exists.status === "pending_verification" ? "Email verification pending" : "Email already exists");
      err.status = 409;
      throw err;
    }

    // Hồ sơ bỏ dở chỉ nhường username khi mã đã hết hạn; tài khoản hoạt động luôn giữ tên.
    const usernameOwner = username ? await userRepo.findByUsername(username) : null;
    if (usernameOwner && (usernameOwner.status !== "pending_verification" ||
        !usernameOwner.registration_code_sent_at ||
        Date.now() - new Date(usernameOwner.registration_code_sent_at).getTime() < REGISTRATION_CODE_TTL_MS)) {
      throw httpError(409, "Username already exists");
    }

    const password_hash = await bcrypt.hash(password, 10);
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const now = new Date();
    return sequelize.transaction(async (transaction) => {
      const fields = {
        email,
        username: username || generatedUsername(),
        password_hash,
        full_name,
        provider: "local",
        provider_id: null,
        role: "guest",
        status: "pending_verification",
        registration_code_hash: registrationCodeHash(email, code),
        registration_code_expires: new Date(now.getTime() + REGISTRATION_CODE_TTL_MS),
        registration_code_sent_at: now,
        registration_code_attempts: 0,
      };
      let user;
      if (usernameOwner) {
        user = await User.findByPk(usernameOwner.id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!user || user.status !== "pending_verification" || !user.registration_code_sent_at ||
            now - new Date(user.registration_code_sent_at) < REGISTRATION_CODE_TTL_MS) {
          throw httpError(409, "Username already exists");
        }
        await user.update(fields, { transaction });
      } else {
        user = await User.create(fields, { transaction });
      }
      await enqueue("send_email", {
        to: email,
        subject: "Mã xác minh đăng ký - Booking BnB",
        html: emails.registrationCode(code),
      }, transaction);
      return { email: user.email, expiresIn: REGISTRATION_CODE_TTL_MS / 1000 };
    });
  },

  /** Khóa tài khoản khi so mã để giới hạn lượt thử và chỉ cấp một phiên sau xác minh. */
  verifyRegistration: async ({ email, code }, meta = {}) => {
    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.findOne({
        where: { email: email.toLowerCase(), provider: "local", status: "pending_verification" },
        transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!user || !user.registration_code_hash || !user.registration_code_expires ||
          new Date(user.registration_code_expires) <= new Date()) {
        return { error: httpError(400, "Verification code is invalid or expired") };
      }
      const expected = Buffer.from(user.registration_code_hash, "hex");
      const actual = Buffer.from(registrationCodeHash(user.email, code), "hex");
      if (!crypto.timingSafeEqual(expected, actual)) {
        const attempts = Number(user.registration_code_attempts || 0) + 1;
        await user.update({ registration_code_attempts: attempts,
          ...(attempts >= REGISTRATION_MAX_ATTEMPTS ? { registration_code_hash: null, registration_code_expires: null } : {}) }, { transaction });
        return { error: httpError(400, "Verification code is invalid or expired") };
      }
      await user.update({ status: "active", registration_code_hash: null,
        registration_code_expires: null, registration_code_sent_at: null,
        registration_code_attempts: 0 }, { transaction });
      const tokens = await module.exports.issueTokens(user, meta, { transaction });
      return { user: sanitizeUser(user), ...tokens };
    });
    if (result.error) throw result.error;
    return result;
  },

  /** Gửi mã mới sau khoảng chờ; mã cũ hết hiệu lực ngay khi mã mới được lưu. */
  resendRegistrationCode: async (email) => {
    return sequelize.transaction(async (transaction) => {
      const user = await User.findOne({
        where: { email: email.toLowerCase(), provider: "local", status: "pending_verification" },
        transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!user) return;
      const now = new Date();
      if (user.registration_code_sent_at && now - new Date(user.registration_code_sent_at) < REGISTRATION_RESEND_WAIT_MS) {
        throw httpError(429, "Please wait before requesting another code");
      }
      const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
      await user.update({ registration_code_hash: registrationCodeHash(user.email, code),
        registration_code_expires: new Date(now.getTime() + REGISTRATION_CODE_TTL_MS),
        registration_code_sent_at: now, registration_code_attempts: 0 }, { transaction });
      await enqueue("send_email", { to: user.email, subject: "Mã xác minh đăng ký - Booking BnB",
        html: emails.registrationCode(code) }, transaction);
    });
  },

  issueTokens: async (user, meta = {}, options = {}) => {
    const authTime = Number.isSafeInteger(meta.authTime) ? meta.authTime : Math.floor(Date.now() / 1000);
    const sessionId = meta.sessionId || crypto.randomUUID();
    const accessToken = createAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      provider: user.provider,
      authTime,
      sessionId,
    });

    const refreshToken = createRefreshToken(authTime);
    const tokenHash = sha256(refreshToken);

    await refreshRepo.create({
      user_id: user.id,
      session_id: sessionId,
      token_hash: tokenHash,
      expires_at: refreshExpiresAt(),
      revoked_at: null,
      created_ip: meta.ip || null,
      user_agent: meta.userAgent || null,
      created_at: new Date(),
      last_active_at: new Date(),
    }, options);

    return { accessToken, refreshToken };
  },

  refresh: async (refreshToken, meta = {}) => {
    if (!refreshToken) {
      const err = new Error("Refresh token is required");
      err.status = 400;
      throw err;
    }

    // Kiểm tra chữ ký và thời hạn trước khi tra token trong DB.
    const { authTime } = decodeToken(refreshToken, "refresh");

    const tokenHash = sha256(refreshToken);
    const result = await sequelize.transaction(async (transaction) => {
      const snapshot = await refreshRepo.findByHash(tokenHash, { transaction });
      if (!snapshot) return { error: httpError(401, "Invalid refresh token") };
      const user = await User.findByPk(snapshot.user_id, { transaction, lock: transaction.LOCK.UPDATE });
      const row = await refreshRepo.findByHash(tokenHash, { transaction, lock: transaction.LOCK.UPDATE });
      if (!row) return { error: httpError(401, "Invalid refresh token") };
      if (row.revoked_at) {
        const activeSuccessor = await refreshRepo.findActiveSession(row.user_id, row.session_id || row.id, { transaction });
        if (!activeSuccessor) return { error: httpError(401, "Invalid refresh token") };
        if (Date.now() - new Date(row.revoked_at).getTime() < 10000) return { error: httpError(409, "Token recently rotated") };
        await refreshRepo.revokeAllByUserId(row.user_id, { transaction });
        return { error: httpError(401, "Invalid refresh token") };
      }
      if (new Date(row.expires_at) <= new Date()) return { error: httpError(401, "Refresh token expired") };
      if (!user || user.status !== "active") return { error: httpError(401, "User invalid") };
      await refreshRepo.revokeByHash(tokenHash, { transaction });
      return { tokens: await module.exports.issueTokens(user, { ...meta, ip: meta.ip || row.created_ip,
        userAgent: meta.userAgent || row.user_agent, sessionId: row.session_id || row.id,
        authTime: Number.isSafeInteger(authTime) ? authTime : 0 }, { transaction }) };
    });
    if (result.error) throw result.error;
    return result.tokens;
  },

  logout: async (refreshToken) => {
    if (!refreshToken) return;
    try {
      decodeToken(refreshToken, "refresh");
    } catch {
      // vẫn revoke theo hash nếu có
    }
    const tokenHash = sha256(refreshToken);
    await refreshRepo.revokeByHash(tokenHash);
  },

  /** Trả metadata của các phiên còn hiệu lực; không bao giờ trả token hoặc User-Agent thô. */
  listSessions: async (userId, currentSessionId) => {
    const rows = await refreshRepo.listActiveByUserId(userId);
    return rows.map((row) => ({
      id: row.session_id,
      ...safeDevice(row.user_agent),
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at || row.created_at,
      current: row.session_id === currentSessionId,
    }));
  },

  sessionIdForRefresh: async (refreshToken, userId) => {
    if (!refreshToken) return null;
    const row = await refreshRepo.findByHash(sha256(refreshToken));
    return row?.user_id === userId && !row.revoked_at && new Date(row.expires_at) > new Date()
      ? row.session_id || row.id : null;
  },

  revokeSession: async (userId, sessionId) => {
    if (typeof sessionId !== "string" || !/^[0-9a-f-]{36}$/.test(sessionId)) throw httpError(400, "Session invalid");
    await refreshRepo.revokeSession(userId, sessionId);
  },

  revokeOtherSessions: async (userId, currentSessionId) => {
    if (!currentSessionId) throw httpError(401, "Session unavailable");
    await refreshRepo.revokeOtherSessions(userId, currentSessionId);
  },

  /** Chỉ nối Google vào tài khoản local qua email đã xác minh và bước xác nhận mật khẩu. */
  findOrCreateSocialUser: async ({ provider, email, full_name, avatar_url, provider_id, email_verified }) => {
    if (!["google", "facebook"].includes(provider) || !provider_id || !email) {
      const err = new Error("Invalid social account");
      err.status = 400;
      throw err;
    }
    if (provider === "google" && email_verified !== true && email_verified !== "true") {
      throw httpError(403, "Google email is not verified");
    }
    let user = provider === "google"
      ? await userRepo.findByGoogleId(provider_id)
      : await userRepo.findByProviderId(provider, provider_id);

    if (!user) {
      const existing = await userRepo.findByEmail(email, provider);
      if (existing) {
        if (existing.status !== "active") throw httpError(403, "User blocked");
        throw httpError(409, "Email already registered with another account from this provider");
      }
      if (provider === "google") {
        const localUser = await userRepo.findByEmail(email);
        if (localUser) {
          if (localUser.status !== "active") throw httpError(403, "User blocked");
          if (!localUser.google_id) {
            const err = httpError(409, "Google account linking requires password confirmation");
            err.code = "GOOGLE_LINK_REQUIRED";
            err.googleLink = { googleId: provider_id, email: localUser.email };
            throw err;
          }
          throw httpError(409, "Another Google account is already linked");
        }
      }

      user = await User.create({
        email,
        username: generatedUsername(),
        full_name,
        avatar_url: avatar_url || null,
        password_hash: null,
        provider,
        provider_id: provider === "google" ? null : provider_id,
        google_id: provider === "google" ? provider_id : null,
        role: "guest",
        status: "active",
      });
    }

    if (user.status !== "active") {
      const err = new Error("User blocked");
      err.status = 403;
      throw err;
    }

    return user;
  },

  /** Gắn Google vào đúng tài khoản local sau khi người dùng xác nhận lại mật khẩu. */
  linkGoogleAccount: async ({ googleId, email, identifier, password }, meta = {}) => {
    return sequelize.transaction(async (transaction) => {
      const user = await User.findOne({
        where: identifier.includes("@")
          ? Sequelize.where(Sequelize.fn("lower", Sequelize.col("email")), identifier.toLowerCase())
          : { username: identifier.toLowerCase() },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user || user.email !== email || user.provider !== "local" || !user.password_hash ||
          !await bcrypt.compare(password, user.password_hash)) {
        throw httpError(401, "Invalid username, email or password");
      }
      if (user.status !== "active") throw httpError(403, "User blocked");
      if (user.google_id && user.google_id !== googleId) throw httpError(409, "Another Google account is already linked");
      if (!user.google_id) await user.update({ google_id: googleId }, { transaction });
      const tokens = await module.exports.issueTokens(user, meta, { transaction });
      return { user: sanitizeUser(user), ...tokens };
    });
  },

  sanitizeUser,

  async forgotPassword(email) {
    await sequelize.transaction(async (transaction) => {
      const user = await User.findOne({ where: { email, provider: "local", status: "active" }, transaction, lock: transaction.LOCK.UPDATE });
      if (!user) return;
      const token = crypto.randomBytes(32).toString("hex");
      await user.update({ reset_password_token: sha256(token), reset_password_expires: new Date(Date.now() + 3600000) }, { transaction });
      const url = new URL("/reset-password", process.env.FRONTEND_URL || "http://localhost:3001");
      url.searchParams.set("token", token);
      await enqueue("send_email", { to: user.email, subject: "Khôi phục mật khẩu - Booking BnB", html: emails.resetPassword(url.toString()) }, transaction);
    });
  },

  async resetPassword(token, newPassword) {
    const password_hash = await bcrypt.hash(newPassword, 10);
    await sequelize.transaction(async (transaction) => {
      const user = await User.findOne({
        where: { reset_password_token: sha256(token), reset_password_expires: { [Sequelize.Op.gt]: new Date() }, provider: "local", status: "active" },
        transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!user) throw httpError(400, "Token is invalid or has expired");
      await user.update({ password_hash, reset_password_token: null, reset_password_expires: null }, { transaction });
      await refreshRepo.revokeAllByUserId(user.id, { transaction });
    });
  },
};
