"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class NotificationPreference extends Model {}
  NotificationPreference.init({
    user_id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
    messages: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    bookings: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    calls: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    reminders: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    offers: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize, modelName: "NotificationPreference", tableName: "notification_preferences",
    createdAt: "created_at", updatedAt: "updated_at" });
  return NotificationPreference;
};
