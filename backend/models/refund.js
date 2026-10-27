"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Refund extends Model {
    static associate(models) {
      Refund.belongsTo(models.Booking, { foreignKey: "booking_id", as: "booking" });
      Refund.belongsTo(models.Payment, { foreignKey: "payment_id", as: "payment" });
      Refund.belongsTo(models.BookingCancellation, { foreignKey: "cancellation_id", as: "cancellation" });
      Refund.hasMany(models.RefundEvent, { foreignKey: "refund_id", as: "events" });
    }
  }
  Refund.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    booking_id: { type: DataTypes.UUID, allowNull: false },
    payment_id: { type: DataTypes.UUID, allowNull: false },
    cancellation_id: { type: DataTypes.UUID },
    source_key: { type: DataTypes.STRING(130), allowNull: false, unique: true },
    amount: { type: DataTypes.BIGINT, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "requested" },
    stripe_refund_id: { type: DataTypes.STRING(255), unique: true },
    attempt: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    failure_reason: { type: DataTypes.STRING(500) },
    admin_note: { type: DataTypes.TEXT },
    provider_updated_at: { type: DataTypes.DATE },
  }, { sequelize, modelName: "Refund", tableName: "refunds",
    createdAt: "created_at", updatedAt: "updated_at" });
  return Refund;
};
