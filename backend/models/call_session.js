"use strict";

const { Model } = require("sequelize");

/** Trạng thái cuộc gọi có thẩm quyền ở server; SDP, ICE và media không được lưu tại đây. */
module.exports = (sequelize, DataTypes) => {
  class CallSession extends Model {
    static associate(models) {
      CallSession.belongsTo(models.ChatConversation, { foreignKey: "conversation_id", as: "conversation" });
      CallSession.belongsTo(models.User, { foreignKey: "caller_id", as: "caller" });
      CallSession.belongsTo(models.User, { foreignKey: "callee_id", as: "callee" });
    }
  }
  CallSession.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    conversation_id: { type: DataTypes.UUID, allowNull: false },
    caller_id: { type: DataTypes.UUID, allowNull: false },
    callee_id: { type: DataTypes.UUID, allowNull: false },
    caller_instance_id: { type: DataTypes.UUID, allowNull: false },
    callee_instance_id: DataTypes.UUID,
    status: { type: DataTypes.STRING(24), allowNull: false },
    revision: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    media_type: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "video" },
    ring_expires_at: { type: DataTypes.DATE, allowNull: false },
    grace_expires_at: DataTypes.DATE,
    accepted_at: DataTypes.DATE,
    connected_at: DataTypes.DATE,
    caller_heartbeat_at: DataTypes.DATE,
    callee_heartbeat_at: DataTypes.DATE,
    ended_at: DataTypes.DATE,
    end_reason: DataTypes.STRING(32),
    last_state_changed_at: { type: DataTypes.DATE, allowNull: false },
  }, { sequelize, modelName: "CallSession", tableName: "call_sessions",
    createdAt: "created_at", updatedAt: "updated_at" });
  return CallSession;
};
