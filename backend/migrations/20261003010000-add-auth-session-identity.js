"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("refresh_tokens", "session_id", { type: Sequelize.UUID }, { transaction });
      await queryInterface.addColumn("refresh_tokens", "last_active_at", { type: Sequelize.DATE }, { transaction });
      await queryInterface.sequelize.query(
        "UPDATE refresh_tokens SET session_id = id, last_active_at = created_at WHERE session_id IS NULL",
        { transaction },
      );
      await queryInterface.changeColumn("refresh_tokens", "session_id", { type: Sequelize.UUID, allowNull: false }, { transaction });
      await queryInterface.addIndex("refresh_tokens", ["user_id", "session_id"], { name: "idx_refresh_tokens_user_session", transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("refresh_tokens", "idx_refresh_tokens_user_session", { transaction });
      await queryInterface.removeColumn("refresh_tokens", "last_active_at", { transaction });
      await queryInterface.removeColumn("refresh_tokens", "session_id", { transaction });
    });
  },
};
