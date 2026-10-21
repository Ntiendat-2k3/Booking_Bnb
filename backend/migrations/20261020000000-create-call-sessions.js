"use strict";

/** Lưu metadata cuộc gọi và khóa một cuộc gọi đang hoạt động cho mỗi người dùng. */
module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const userRef = () => ({ type: S.UUID, allowNull: false,
        references: { model: "users", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" });
      const callRef = () => ({ type: S.UUID, allowNull: false,
        references: { model: "call_sessions", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" });
      await queryInterface.createTable("call_sessions", {
        id: { type: S.UUID, defaultValue: S.UUIDV4, primaryKey: true },
        conversation_id: { type: S.UUID, allowNull: false,
          references: { model: "chat_conversations", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
        caller_id: userRef(), callee_id: userRef(),
        caller_instance_id: { type: S.UUID, allowNull: false },
        callee_instance_id: { type: S.UUID },
        status: { type: S.STRING(24), allowNull: false },
        revision: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        media_type: { type: S.STRING(16), allowNull: false, defaultValue: "video" },
        ring_expires_at: { type: S.DATE, allowNull: false },
        grace_expires_at: { type: S.DATE },
        accepted_at: { type: S.DATE }, connected_at: { type: S.DATE },
        caller_heartbeat_at: { type: S.DATE }, callee_heartbeat_at: { type: S.DATE },
        ended_at: { type: S.DATE }, end_reason: { type: S.STRING(32) },
        last_state_changed_at: { type: S.DATE, allowNull: false },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
      await queryInterface.createTable("call_active_users", {
        user_id: { ...userRef(), primaryKey: true },
        call_id: callRef(),
      }, { transaction });
      await queryInterface.sequelize.query(`CREATE UNIQUE INDEX call_sessions_active_conversation
        ON call_sessions (conversation_id) WHERE ended_at IS NULL`, { transaction });
      await queryInterface.sequelize.query(`CREATE INDEX call_sessions_active_caller
        ON call_sessions (caller_id) WHERE ended_at IS NULL`, { transaction });
      await queryInterface.sequelize.query(`CREATE INDEX call_sessions_active_callee
        ON call_sessions (callee_id) WHERE ended_at IS NULL`, { transaction });
      await queryInterface.addIndex("call_sessions", ["status", "ring_expires_at"], { transaction });
      await queryInterface.addIndex("call_sessions", ["status", "grace_expires_at"], { transaction });
      await queryInterface.addIndex("call_sessions", ["status", "caller_heartbeat_at"], { transaction });
      await queryInterface.addIndex("call_sessions", ["status", "callee_heartbeat_at"], { transaction });
      await queryInterface.addIndex("call_active_users", ["call_id"], { transaction });
      await queryInterface.sequelize.query(`ALTER TABLE call_sessions
        ADD CONSTRAINT call_sessions_distinct_users CHECK (caller_id <> callee_id)`, { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("call_active_users", { transaction });
      await queryInterface.dropTable("call_sessions", { transaction });
    });
  },
};
