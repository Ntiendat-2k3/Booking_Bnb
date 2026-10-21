"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ChatMessagePin extends Model {}
  ChatMessagePin.init({
    message_id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
    conversation_id: { type: DataTypes.UUID, allowNull: false },
    pinned_by: { type: DataTypes.UUID, allowNull: false },
  }, { sequelize, modelName: "ChatMessagePin", tableName: "chat_message_pins",
    createdAt: "created_at", updatedAt: false });
  return ChatMessagePin;
};
