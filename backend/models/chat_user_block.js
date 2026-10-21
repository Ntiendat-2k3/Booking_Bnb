"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ChatUserBlock extends Model {}
  ChatUserBlock.init({
    blocker_id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
    blocked_id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
  }, { sequelize, modelName: "ChatUserBlock", tableName: "chat_user_blocks",
    createdAt: "created_at", updatedAt: false });
  return ChatUserBlock;
};
