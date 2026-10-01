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

const userRepo = new UserRepository();
const refreshRepo = new RefreshTokenRepository();

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
  registerLocal: async ({ email, username, password, full_name }, meta = {}) => {
    if (!email || !password || !full_name) {
      const err = new Error("Email, password, full_name are required");
      err.status = 400;
      throw err;
    }

    const exists = await userRepo.findByEmail(email);
    if (exists) {
      const err = new Error("Email already exists");
      err.status = 409;
      throw err;
    }

    if (username && await userRepo.findByUsername(username)) {
      throw httpError(409, "Username already exists");
    }

    const password_hash = await bcrypt.hash(password, 10);
    return sequelize.transaction(async (transaction) => {
      const user = await User.create({
        email,
        username: username || generatedUsername(),
        password_hash,
        full_name,
        provider: "local",
        provider_id: null,
        role: "guest",
        status: "active",
      }, { transaction });

      const tokens = await module.exports.issueTokens(user, meta, { transaction });
      return { user: sanitizeUser(user), ...tokens };
    });
  },

  issueTokens: async (user, meta = {}, options = {}) => {
    const accessToken = createAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      provider: user.provider,
    });

    const refreshToken = createRefreshToken();
    const tokenHash = sha256(refreshToken);

    await refreshRepo.create({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: refreshExpiresAt(),
      revoked_at: null,
      created_ip: meta.ip || null,
      user_agent: meta.userAgent || null,
      created_at: new Date(),
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
    decodeToken(refreshToken, "refresh");

    const tokenHash = sha256(refreshToken);
    const result = await sequelize.transaction(async (transaction) => {
      const snapshot = await refreshRepo.findByHash(tokenHash, { transaction });
      if (!snapshot) return { error: httpError(401, "Invalid refresh token") };
      const user = await User.findByPk(snapshot.user_id, { transaction, lock: transaction.LOCK.UPDATE });
      const row = await refreshRepo.findByHash(tokenHash, { transaction, lock: transaction.LOCK.UPDATE });
      if (!row) return { error: httpError(401, "Invalid refresh token") };
      if (row.revoked_at) {
        if (Date.now() - new Date(row.revoked_at).getTime() < 10000) return { error: httpError(409, "Token recently rotated") };
        await refreshRepo.revokeAllByUserId(row.user_id, { transaction });
        return { error: httpError(401, "Refresh token revoked due to reuse") };
      }
      if (new Date(row.expires_at) <= new Date()) return { error: httpError(401, "Refresh token expired") };
      if (!user || user.status !== "active") return { error: httpError(401, "User invalid") };
      await refreshRepo.revokeByHash(tokenHash, { transaction });
      return { tokens: await module.exports.issueTokens(user, meta, { transaction }) };
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

  /** Chỉ nối Google vào tài khoản local qua email đã xác minh và bước xác nhận mật khẩu. */
  findOrCreateSocialUser: async ({ provider, email, full_name, avatar_url, provider_id, email_verified }) => {
    if (!["google", "apple", "facebook"].includes(provider) || !provider_id || !email) {
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
      const existing = await userRepo.findByEmail(email);
      if (existing) {
        if (existing.status !== "active") throw httpError(403, "User blocked");
        if (provider === "google" && existing.provider === "local" && !existing.google_id) {
          const err = httpError(409, "Google account linking requires password confirmation");
          err.code = "GOOGLE_LINK_REQUIRED";
          err.googleLink = { googleId: provider_id, email: existing.email };
          throw err;
        }
        const err = new Error("Email already registered with another login method");
        err.status = 409;
        throw err;
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
