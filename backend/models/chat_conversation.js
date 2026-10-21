"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ChatConversation extends Model {
    static associate(models) {
      ChatConversation.hasMany(models.ChatParticipant, { foreignKey: "conversation_id", as: "participants" });
      ChatConversation.hasMany(models.ChatMessage, { foreignKey: "conversation_id", as: "messages" });
    }
  }
  ChatConversation.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    kind: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "direct" },
    direct_key: { type: DataTypes.STRING(90), allowNull: false, unique: true },
    created_by: { type: DataTypes.UUID, allowNull: false },
    last_activity_at: { type: DataTypes.DATE, allowNull: false },
  }, { sequelize, modelName: "ChatConversation", tableName: "chat_conversations", createdAt: "created_at", updatedAt: "updated_at" });
  return ChatConversation;
};
