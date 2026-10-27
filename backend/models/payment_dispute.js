"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class PaymentDispute extends Model {
    static associate(models) {
      PaymentDispute.belongsTo(models.Booking, { foreignKey: "booking_id", as: "booking" });
      PaymentDispute.belongsTo(models.Payment, { foreignKey: "payment_id", as: "payment" });
    }
  }
  PaymentDispute.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    booking_id: { type: DataTypes.UUID, allowNull: false },
    payment_id: { type: DataTypes.UUID, allowNull: false },
    stripe_dispute_id: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    amount: { type: DataTypes.BIGINT, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false },
    provider_status: { type: DataTypes.STRING(40), allowNull: false },
    reason: { type: DataTypes.STRING(100) },
    evidence_due_at: { type: DataTypes.DATE },
    admin_note: { type: DataTypes.TEXT },
    reviewed_by: { type: DataTypes.UUID },
    reviewed_at: { type: DataTypes.DATE },
  }, { sequelize, modelName: "PaymentDispute", tableName: "payment_disputes",
    createdAt: "created_at", updatedAt: "updated_at" });
  return PaymentDispute;
};
