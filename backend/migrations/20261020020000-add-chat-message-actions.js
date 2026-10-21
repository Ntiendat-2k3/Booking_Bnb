"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("chat_messages", "reply_to_id", {
        type: S.UUID, allowNull: true,
        references: { model: "chat_messages", key: "id" },
        onDelete: "SET NULL", onUpdate: "CASCADE",
      }, { transaction });
      await queryInterface.addColumn("chat_messages", "recalled_at", {
        type: S.DATE, allowNull: true,
      }, { transaction });
      await queryInterface.addColumn("chat_messages", "recalled_by", {
        type: S.UUID, allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL", onUpdate: "CASCADE",
      }, { transaction });
      await queryInterface.addColumn("chat_messages", "edited_at", {
        type: S.DATE, allowNull: true,
      }, { transaction });
      await queryInterface.addColumn("chat_messages", "revision", {
        type: S.INTEGER, allowNull: false, defaultValue: 0,
      }, { transaction });
      await queryInterface.addIndex("chat_messages", ["reply_to_id"], { transaction });
      await queryInterface.createTable("chat_message_reactions", {
        message_id: { type: S.UUID, primaryKey: true, allowNull: false,
          references: { model: "chat_messages", key: "id" }, onDelete: "CASCADE" },
        user_id: { type: S.UUID, primaryKey: true, allowNull: false,
          references: { model: "users", key: "id" }, onDelete: "CASCADE" },
        emoji: { type: S.STRING(16), primaryKey: true, allowNull: false },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("chat_message_reactions", { transaction });
      await queryInterface.removeIndex("chat_messages", ["reply_to_id"], { transaction });
      await queryInterface.removeColumn("chat_messages", "revision", { transaction });
      await queryInterface.removeColumn("chat_messages", "edited_at", { transaction });
      await queryInterface.removeColumn("chat_messages", "recalled_by", { transaction });
      await queryInterface.removeColumn("chat_messages", "recalled_at", { transaction });
      await queryInterface.removeColumn("chat_messages", "reply_to_id", { transaction });
    });
  },
};
