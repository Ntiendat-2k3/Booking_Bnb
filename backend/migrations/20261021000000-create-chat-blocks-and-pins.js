"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable("chat_user_blocks", {
        blocker_id: { type: S.UUID, allowNull: false, primaryKey: true,
          references: { model: "users", key: "id" }, onDelete: "CASCADE" },
        blocked_id: { type: S.UUID, allowNull: false, primaryKey: true,
          references: { model: "users", key: "id" }, onDelete: "CASCADE" },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
      await queryInterface.addIndex("chat_user_blocks", ["blocked_id", "blocker_id"], { transaction });
      await queryInterface.createTable("chat_message_pins", {
        message_id: { type: S.UUID, allowNull: false, primaryKey: true,
          references: { model: "chat_messages", key: "id" }, onDelete: "CASCADE" },
        conversation_id: { type: S.UUID, allowNull: false,
          references: { model: "chat_conversations", key: "id" }, onDelete: "CASCADE" },
        pinned_by: { type: S.UUID, allowNull: false,
          references: { model: "users", key: "id" }, onDelete: "CASCADE" },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
      await queryInterface.addIndex("chat_message_pins", ["conversation_id", "created_at"], { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("chat_message_pins", { transaction });
      await queryInterface.dropTable("chat_user_blocks", { transaction });
    });
  },
};
