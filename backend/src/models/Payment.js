const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Payment = sequelize.define(
    "Payment",
    {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      bookingId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "booking_id",
      },

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

      providerTxnRef: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "provider_txn_ref",
      },
      providerTransactionNo: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "provider_transaction_no",
      },
      paidAt: { type: DataTypes.DATE, allowNull: true, field: "paid_at" },

      payload: { type: DataTypes.JSONB, allowNull: true },
    },
    {
      tableName: "payments",
      underscored: true,
      timestamps: true,
    },
  );

  Payment.associate = (db) => {
    Payment.belongsTo(db.Booking, { foreignKey: "booking_id", as: "booking" });
  };

  return Payment;
};
