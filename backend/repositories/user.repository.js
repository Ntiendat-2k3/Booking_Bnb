const Repository = require("../core/repository");
const { User } = require("../models/index");

// : xử lý logic
module.exports = class UserRepository extends Repository {
  getModel() {
    return User;
  }

  findByEmail(email) {
    return this.model.findOne({ where: { email } });
  }

  findByProviderId(provider, providerId) {
    return this.model.findOne({ where: { provider, provider_id: providerId } });
  }
};
