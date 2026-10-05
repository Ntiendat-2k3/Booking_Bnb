"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable("passkey_credentials", {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        user_id: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
        credential_id: { type: Sequelize.TEXT, allowNull: false, unique: true },
        public_key: { type: Sequelize.BLOB, allowNull: false },
        counter: { type: Sequelize.BIGINT, allowNull: false, defaultValue: 0 },
        transports: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        device_type: { type: Sequelize.STRING(20), allowNull: false },
        backed_up: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        name: { type: Sequelize.STRING(80), allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
        last_used_at: { type: Sequelize.DATE },
      }, { transaction });
      await queryInterface.addIndex("passkey_credentials", ["user_id"], { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("passkey_credentials");
  },
};
