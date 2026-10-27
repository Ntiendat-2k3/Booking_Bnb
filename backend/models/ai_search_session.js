"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AiSearchSession extends Model {}
  AiSearchSession.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    criteria: { type: DataTypes.JSONB, allowNull: false },
    result_ids: { type: DataTypes.JSONB, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false },
  }, { sequelize, modelName: "AiSearchSession", tableName: "ai_search_sessions", timestamps: false });
  return AiSearchSession;
};
