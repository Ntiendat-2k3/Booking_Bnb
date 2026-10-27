"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PaymentCollection extends Model {
    static associate(models) {
      PaymentCollection.belongsTo(models.Booking, { foreignKey: "booking_id", as: "booking" });
      PaymentCollection.belongsTo(models.Payment, { foreignKey: "payment_id", as: "payment" });
    }
  }
  PaymentCollection.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    booking_id: { type: DataTypes.UUID, allowNull: false },
    payment_id: { type: DataTypes.UUID, allowNull: false },
    amount: { type: DataTypes.BIGINT, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false },
    method: { type: DataTypes.STRING(20), allowNull: false },
    external_ref: { type: DataTypes.STRING(255) },
    collected_by: { type: DataTypes.UUID, allowNull: false },
    collected_at: { type: DataTypes.DATE, allowNull: false },
    reconciled_by: { type: DataTypes.UUID },
    reconciled_at: { type: DataTypes.DATE },
  }, { sequelize, modelName: "PaymentCollection", tableName: "payment_collections",
    createdAt: "created_at", updatedAt: false });
  return PaymentCollection;
};
