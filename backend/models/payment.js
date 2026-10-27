"use strict";
const { Model } = require("sequelize");
const { transformPayment } = require("../transformers/payment.transformer");

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    /** Chỉ xuất mã giao dịch dễ đọc qua API, giữ số tham chiếu bên trong database. */
    toJSON() {
      return transformPayment(super.toJSON());
    }

    static associate(models) {
      Payment.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking",
      });
      Payment.hasMany(models.Refund, { foreignKey: "payment_id", as: "refunds" });
      Payment.hasMany(models.PaymentDispute, { foreignKey: "payment_id", as: "disputes" });
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
      reference_number: { type: DataTypes.BIGINT, autoIncrement: true, allowNull: false, unique: true },

      provider: { type: DataTypes.ENUM("vnpay", "stripe", "property"), allowNull: false },
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
