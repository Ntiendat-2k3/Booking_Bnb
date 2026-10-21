"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ChatParticipant extends Model {
    static associate(models) {
      ChatParticipant.belongsTo(models.ChatConversation, { foreignKey: "conversation_id", as: "conversation" });
      ChatParticipant.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    }
  }
  ChatParticipant.init({
    conversation_id: { type: DataTypes.UUID, primaryKey: true },
    user_id: { type: DataTypes.UUID, primaryKey: true },
    last_read_sequence: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    joined_at: { type: DataTypes.DATE, allowNull: false },
  }, { sequelize, modelName: "ChatParticipant", tableName: "chat_participants", createdAt: "created_at", updatedAt: "updated_at" });
  return ChatParticipant;
};
