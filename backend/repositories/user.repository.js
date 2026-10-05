const Repository = require("../core/repository");
const { User, Sequelize } = require("../models/index");

// : xử lý logic
module.exports = class UserRepository extends Repository {
  getModel() {
    return User;
  }

  findByEmail(email, provider = "local") {
    return this.model.findOne({ where: {
      [Sequelize.Op.and]: [
        Sequelize.where(Sequelize.fn("lower", Sequelize.col("email")), email.toLowerCase()),
        { provider },
      ],
    } });
  }

  findByUsername(username) {
    return this.model.findOne({ where: { username } });
  }

  findByGoogleId(googleId) {
    return this.model.findOne({ where: { google_id: googleId } });
  }

  findByProviderId(provider, providerId) {
    return this.model.findOne({ where: { provider, provider_id: providerId } });
  }
};
