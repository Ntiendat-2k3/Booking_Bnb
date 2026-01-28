"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PaymentMethod extends Model {
    static associate(models) {
      PaymentMethod.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });
    }
  }

  PaymentMethod.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: { type: DataTypes.UUID, allowNull: false },

      provider: {
        type: DataTypes.ENUM("vnpay", "stripe", "momo", "bank"),
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("card", "ewallet", "bank_transfer"),
        allowNull: false,
      },

      label: { type: DataTypes.STRING(255), allowNull: false },
      is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      meta: { type: DataTypes.JSONB, allowNull: true },
    },
    {
      sequelize,
      modelName: "PaymentMethod",
      tableName: "payment_methods",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return PaymentMethod;
};
