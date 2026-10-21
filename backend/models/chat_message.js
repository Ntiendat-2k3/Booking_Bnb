"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ChatMessage extends Model {
    static associate(models) {
      ChatMessage.belongsTo(models.ChatConversation, { foreignKey: "conversation_id", as: "conversation" });
      ChatMessage.belongsTo(models.User, { foreignKey: "sender_id", as: "sender" });
      ChatMessage.belongsTo(models.ChatMessage, { foreignKey: "reply_to_id", as: "replyTo" });
      ChatMessage.hasMany(models.ChatMessageReaction, { foreignKey: "message_id", as: "reactions" });
    }
  }
  ChatMessage.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    sequence: { type: DataTypes.BIGINT, autoIncrement: true, unique: true },
    conversation_id: { type: DataTypes.UUID, allowNull: false },
    sender_id: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.STRING(24), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    context: { type: DataTypes.JSONB, allowNull: true },
    client_key: { type: DataTypes.STRING(100), allowNull: false },
    reply_to_id: { type: DataTypes.UUID, allowNull: true },
    recalled_at: { type: DataTypes.DATE, allowNull: true },
    recalled_by: { type: DataTypes.UUID, allowNull: true },
    edited_at: { type: DataTypes.DATE, allowNull: true },
    revision: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, { sequelize, modelName: "ChatMessage", tableName: "chat_messages", createdAt: "created_at", updatedAt: false });
  return ChatMessage;
};
