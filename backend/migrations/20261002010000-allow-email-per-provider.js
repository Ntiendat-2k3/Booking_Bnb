"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key", { transaction });
      await queryInterface.sequelize.query("DROP INDEX IF EXISTS users_email_lower_unique", { transaction });
      await queryInterface.sequelize.query("CREATE UNIQUE INDEX users_email_provider_lower_unique ON users (LOWER(email), provider)", { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Khôi phục ràng buộc cũ chỉ khi dữ liệu không còn email trùng giữa các provider.
      await queryInterface.sequelize.query("CREATE UNIQUE INDEX users_email_lower_unique ON users (LOWER(email))", { transaction });
      await queryInterface.sequelize.query("ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)", { transaction });
      await queryInterface.sequelize.query("DROP INDEX users_email_provider_lower_unique", { transaction });
    });
  },
};
