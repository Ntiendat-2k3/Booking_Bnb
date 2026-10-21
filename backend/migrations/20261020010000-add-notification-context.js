"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("Notifications", "resource_type", {
        type: S.STRING(32), allowNull: true,
      }, { transaction });
      await queryInterface.addColumn("Notifications", "resource_id", {
        type: S.UUID, allowNull: true,
      }, { transaction });
      await queryInterface.addColumn("Notifications", "dedupe_key", {
        type: S.STRING(100), allowNull: true,
      }, { transaction });
      await queryInterface.addIndex("Notifications", ["user_id", "dedupe_key"], {
        unique: true, name: "notifications_user_dedupe_key", transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("Notifications", "notifications_user_dedupe_key", { transaction });
      await queryInterface.removeColumn("Notifications", "dedupe_key", { transaction });
      await queryInterface.removeColumn("Notifications", "resource_id", { transaction });
      await queryInterface.removeColumn("Notifications", "resource_type", { transaction });
    });
  },
};
