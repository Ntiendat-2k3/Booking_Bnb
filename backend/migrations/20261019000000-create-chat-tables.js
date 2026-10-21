"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const ref = (table) => ({ type: S.UUID, allowNull: false, references: { model: table, key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" });
      const timestamp = { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") };
      await queryInterface.createTable("chat_conversations", {
        id: { type: S.UUID, defaultValue: S.UUIDV4, primaryKey: true },
        kind: { type: S.STRING(20), allowNull: false, defaultValue: "direct" },
        direct_key: { type: S.STRING(73), allowNull: false, unique: true },
        created_by: ref("users"),
        last_activity_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
      }, { transaction });
      await queryInterface.createTable("chat_participants", {
        conversation_id: { ...ref("chat_conversations"), primaryKey: true },
        user_id: { ...ref("users"), primaryKey: true },
        last_read_sequence: { type: S.BIGINT, allowNull: false, defaultValue: 0 },
        joined_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
      }, { transaction });
      await queryInterface.createTable("chat_messages", {
        id: { type: S.UUID, defaultValue: S.UUIDV4, primaryKey: true },
        sequence: { type: S.BIGINT, autoIncrement: true, allowNull: false, unique: true },
        conversation_id: ref("chat_conversations"),
        sender_id: ref("users"),
        type: { type: S.STRING(24), allowNull: false },
        body: { type: S.TEXT },
        context: { type: S.JSONB },
        client_key: { type: S.STRING(100), allowNull: false },
        created_at: timestamp,
      }, { transaction });
      await queryInterface.addIndex("chat_participants", ["user_id", "conversation_id"], { transaction });
      await queryInterface.addIndex("chat_messages", ["conversation_id", "sequence"], { transaction });
      await queryInterface.addIndex("chat_messages", ["sender_id", "client_key"], { unique: true, transaction });
      await queryInterface.addIndex("chat_conversations", ["last_activity_at", "id"], { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("chat_messages", { transaction });
      await queryInterface.dropTable("chat_participants", { transaction });
      await queryInterface.dropTable("chat_conversations", { transaction });
    });
  },
};
