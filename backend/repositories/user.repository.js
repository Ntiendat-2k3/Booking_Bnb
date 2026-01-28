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

  findByGoogleProviderId(providerId) {
    return this.model.findOne({ where: { provider: "google", provider_id: providerId } });
  }
};
