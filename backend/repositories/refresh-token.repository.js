const Repository = require("../core/repository");
const { RefreshToken } = require("../models/index");

module.exports = class RefreshTokenRepository extends Repository {
  getModel() {
    return RefreshToken;
  }

  findByHash(tokenHash, options = {}) {
    return this.model.findOne({ where: { token_hash: tokenHash }, ...options });
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
