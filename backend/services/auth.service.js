const bcrypt = require("bcrypt");
const { User } = require("../models/index");
const UserRepository = require("../repositories/user.repository");
const RefreshTokenRepository = require("../repositories/refresh-token.repository");
const { createAccessToken, createRefreshToken, decodeToken } = require("../utils/jwt");
const { sha256 } = require("../utils/crypto");

const userRepo = new UserRepository();
const refreshRepo = new RefreshTokenRepository();

function parseExpiryToMs(expStr, fallbackMs) {
  if (!expStr) return fallbackMs;
  const m = String(expStr).trim().match(/^([0-9]+)\s*([smhd])$/i);
  if (!m) return fallbackMs;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const mult = unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return n * mult;
}

function refreshExpiresAt() {
  const exp = process.env.JWT_REFRESH_TOKEN_EXPIRES || "30d";
  const ms = parseExpiryToMs(exp, 30 * 86_400_000);
  return new Date(Date.now() + ms);
}

function sanitizeUser(user) {
  if (!user) return null;
  const plain = user.toJSON ? user.toJSON() : user;
  delete plain.password_hash;
  return plain;
}

module.exports = {
  registerLocal: async ({ email, password, full_name }, meta = {}) => {
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

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password_hash,
      full_name,
      provider: "local",
      provider_id: null,
      role: "guest",
      status: "active",
    });

    const tokens = await module.exports.issueTokens(user, meta);
    return { user: sanitizeUser(user), ...tokens };
  },

  issueTokens: async (user, meta = {}) => {
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
    });

    return { accessToken, refreshToken };
  },

  refresh: async (refreshToken, meta = {}) => {
    if (!refreshToken) {
      const err = new Error("Refresh token is required");
      err.status = 400;
      throw err;
    }

    // verify signature + exp
    decodeToken(refreshToken, "refresh");

    const tokenHash = sha256(refreshToken);
    const row = await refreshRepo.findByHash(tokenHash);

    if (!row) {
      const err = new Error("Invalid refresh token");
      err.status = 401;
      throw err;
    }
    if (row.revoked_at) {
      // Token reuse detected (stolen old refresh token).
      // Revoke ALL active refresh tokens of this user as a safety measure.
      await refreshRepo.revokeAllByUserId(row.user_id);

      const err = new Error("Refresh token revoked");
      err.status = 401;
      throw err;
    }
    if (row.expires_at < new Date()) {
      const err = new Error("Refresh token expired");
      err.status = 401;
      throw err;
    }

    // rotate: revoke old, create new
    await refreshRepo.revokeByHash(tokenHash);

    const user = await User.findByPk(row.user_id);
    if (!user || user.status !== "active") {
      const err = new Error("User invalid");
      err.status = 401;
      throw err;
    }

    return module.exports.issueTokens(user, meta);
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

  // dùng cho google callback để tạo/ lấy user
  findOrCreateGoogleUser: async ({ email, full_name, avatar_url, provider_id }) => {
    let user = await userRepo.findByGoogleProviderId(provider_id);

    if (!user) {
      // nếu email đã tồn tại local => chặn (MVP)
      const existing = await userRepo.findByEmail(email);
      if (existing && existing.provider === "local") {
        const err = new Error("Email already registered with local login");
        err.status = 409;
        throw err;
      }

      user = await User.create({
        email,
        full_name,
        avatar_url: avatar_url || null,
        password_hash: null,
        provider: "google",
        provider_id,
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

  sanitizeUser,
};
