const Repository = require("../core/repository");
const { RefreshToken } = require("../models/index");

module.exports = class RefreshTokenRepository extends Repository {
  getModel() {
    return RefreshToken;
  }

  findByHash(tokenHash) {
    return this.model.findOne({ where: { token_hash: tokenHash } });
  }

  revokeByHash(tokenHash) {
    return this.model.update(
      { revoked_at: new Date() },
      { where: { token_hash: tokenHash, revoked_at: null } },
    );
  }

  revokeAllByUserId(userId) {
    return this.model.update(
      { revoked_at: new Date() },
      { where: { user_id: userId, revoked_at: null } },
    );
  }
};
