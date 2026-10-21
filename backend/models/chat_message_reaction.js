"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ChatMessageReaction extends Model {
    static associate(models) {
      ChatMessageReaction.belongsTo(models.ChatMessage, { foreignKey: "message_id", as: "message" });
      ChatMessageReaction.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    }
  }
  ChatMessageReaction.init({
    message_id: { type: DataTypes.UUID, primaryKey: true },
    user_id: { type: DataTypes.UUID, primaryKey: true },
    emoji: { type: DataTypes.STRING(16), primaryKey: true },
  }, { sequelize, modelName: "ChatMessageReaction", tableName: "chat_message_reactions",
    createdAt: "created_at", updatedAt: false });
  return ChatMessageReaction;
};
