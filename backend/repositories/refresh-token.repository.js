const Repository = require("../core/repository");
const { RefreshToken } = require("../models/index");
const { Op } = require("sequelize");

module.exports = class RefreshTokenRepository extends Repository {
  getModel() {
    return RefreshToken;
  }

  findByHash(tokenHash, options = {}) {
    return this.model.findOne({ where: { token_hash: tokenHash }, ...options });
  }

  findActiveSession(userId, sessionId, options = {}) {
    return this.model.findOne({ where: { user_id: userId, session_id: sessionId,
      revoked_at: null, expires_at: { [Op.gt]: new Date() } }, ...options });
  }

  listActiveByUserId(userId) {
    return this.model.findAll({ where: { user_id: userId, revoked_at: null,
      expires_at: { [Op.gt]: new Date() } }, order: [["last_active_at", "DESC"]] });
  }

  revokeSession(userId, sessionId) {
    return this.model.update({ revoked_at: new Date() }, { where: { user_id: userId,
      session_id: sessionId, revoked_at: null } });
  }

  revokeOtherSessions(userId, sessionId) {
    return this.model.update({ revoked_at: new Date() }, { where: { user_id: userId,
      session_id: { [Op.ne]: sessionId }, revoked_at: null } });
  }

  touchSession(id) {
    return this.model.update({ last_active_at: new Date() }, { where: { id, revoked_at: null } });
  }

  revokeByHash(tokenHash, options = {}) {
    return this.model.update(
      { revoked_at: new Date() },
      { where: { token_hash: tokenHash, revoked_at: null }, ...options },
    );
  }

  revokeAllByUserId(userId, options = {}) {
    return this.model.update(
      { revoked_at: new Date() },
      { where: { user_id: userId, revoked_at: null }, ...options },
    );
  }
};
