"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class RefundEvent extends Model {
    static associate(models) {
      RefundEvent.belongsTo(models.Refund, { foreignKey: "refund_id", as: "refund" });
    }
  }
  RefundEvent.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    refund_id: { type: DataTypes.UUID, allowNull: false },
    actor_id: { type: DataTypes.UUID },
    provider_event_id: { type: DataTypes.STRING(255), unique: true },
    action: { type: DataTypes.STRING(30), allowNull: false },
    note: { type: DataTypes.TEXT },
  }, { sequelize, modelName: "RefundEvent", tableName: "refund_events",
    createdAt: "created_at", updatedAt: false });
  return RefundEvent;
};
