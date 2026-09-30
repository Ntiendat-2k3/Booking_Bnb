"use strict";

module.exports = (sequelize, DataTypes) => sequelize.define("BackgroundJob", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: { type: DataTypes.STRING(40), allowNull: false },
  payload: { type: DataTypes.JSONB, allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pending" },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  available_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  locked_at: { type: DataTypes.DATE, allowNull: true },
  lock_token: { type: DataTypes.UUID, allowNull: true },
  last_error: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: "background_jobs",
  createdAt: "created_at",
  updatedAt: "updated_at",
});
