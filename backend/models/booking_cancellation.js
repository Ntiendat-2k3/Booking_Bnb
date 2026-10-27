"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class BookingCancellation extends Model {
    static associate(models) {
      BookingCancellation.belongsTo(models.Booking, { foreignKey: "booking_id", as: "booking" });
      BookingCancellation.hasMany(models.Refund, { foreignKey: "cancellation_id", as: "refunds" });
    }
  }
  BookingCancellation.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    booking_id: { type: DataTypes.UUID, allowNull: false, unique: true },
    actor_id: { type: DataTypes.UUID, allowNull: false },
    policy_snapshot: { type: DataTypes.JSONB, allowNull: false },
    paid_amount: { type: DataTypes.BIGINT, allowNull: false },
    refund_amount: { type: DataTypes.BIGINT, allowNull: false },
    non_refundable_amount: { type: DataTypes.BIGINT, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false },
    reason: { type: DataTypes.STRING(500) },
  }, { sequelize, modelName: "BookingCancellation", tableName: "booking_cancellations",
    createdAt: "created_at", updatedAt: false });
  return BookingCancellation;
};
