"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable("uploaded_assets", {
        public_id: { type: Sequelize.TEXT, primaryKey: true },
        user_id: { type: Sequelize.UUID, allowNull: false, references: { model: "users", key: "id" } },
        listing_id: { type: Sequelize.UUID, allowNull: true, references: { model: "listings", key: "id" } },
        metadata: { type: Sequelize.JSONB, allowNull: false },
        delete_requested: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      }, { transaction });
      await queryInterface.addIndex("uploaded_assets", ["user_id"], { transaction });
      await queryInterface.createTable("background_jobs", {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        type: { type: Sequelize.STRING(40), allowNull: false },
        payload: { type: Sequelize.JSONB, allowNull: false },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "pending" },
        attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        available_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
        locked_at: { type: Sequelize.DATE, allowNull: true },
        lock_token: { type: Sequelize.UUID, allowNull: true },
        last_error: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      }, { transaction });
      await queryInterface.addIndex("background_jobs", ["status", "available_at"], { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("background_jobs", { transaction });
      await queryInterface.dropTable("uploaded_assets", { transaction });
    });
  },
};
