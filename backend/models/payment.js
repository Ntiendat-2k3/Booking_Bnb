"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      Payment.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking",
      });
    }
  }

  Payment.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      booking_id: { type: DataTypes.UUID, allowNull: false },

      provider: { type: DataTypes.ENUM("vnpay", "stripe"), allowNull: false },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "succeeded",
          "failed",
          "cancelled",
          "refunded",
        ),
        allowNull: false,
        defaultValue: "pending",
      },

      amount: { type: DataTypes.BIGINT, allowNull: false },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "VND",
      },

      provider_txn_ref: { type: DataTypes.STRING(255), allowNull: true },
      provider_transaction_no: { type: DataTypes.STRING(255), allowNull: true },
      paid_at: { type: DataTypes.DATE, allowNull: true },

      payload: { type: DataTypes.JSONB, allowNull: true },
    },
    {
      sequelize,
      modelName: "Payment",
      tableName: "payments",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return Payment;
};
