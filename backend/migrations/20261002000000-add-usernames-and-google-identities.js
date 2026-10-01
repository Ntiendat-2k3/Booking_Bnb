"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("users", "username", { type: Sequelize.STRING(40), allowNull: true }, { transaction });
      await queryInterface.addColumn("users", "google_id", { type: Sequelize.STRING(255), allowNull: true }, { transaction });

      // Giữ nguyên ID tài khoản cũ; username mặc định dựa trên UUID nên không trùng nhau.
      await queryInterface.sequelize.query("UPDATE users SET username = 'user_' || replace(id::text, '-', '') WHERE username IS NULL", { transaction });
      await queryInterface.sequelize.query("UPDATE users SET google_id = provider_id WHERE provider::text = 'google' AND provider_id IS NOT NULL", { transaction });

      await queryInterface.changeColumn("users", "username", { type: Sequelize.STRING(40), allowNull: false }, { transaction });
      await queryInterface.addIndex("users", ["username"], { unique: true, name: "users_username_unique", transaction });
      await queryInterface.addIndex("users", ["google_id"], { unique: true, name: "users_google_id_unique", transaction });
      await queryInterface.sequelize.query("CREATE UNIQUE INDEX users_email_lower_unique ON users (LOWER(email))", { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query("DROP INDEX users_email_lower_unique", { transaction });
      await queryInterface.removeIndex("users", "users_google_id_unique", { transaction });
      await queryInterface.removeIndex("users", "users_username_unique", { transaction });
      await queryInterface.removeColumn("users", "google_id", { transaction });
      await queryInterface.removeColumn("users", "username", { transaction });
    });
  },
};
