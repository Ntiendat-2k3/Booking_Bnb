const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PaymentMethod = sequelize.define(
    "PaymentMethod",
    {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      userId: { type: DataTypes.UUID, allowNull: false, field: "user_id" },
      provider: {
        type: DataTypes.ENUM("vnpay", "stripe", "momo", "bank"),
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("card", "ewallet", "bank_transfer"),
        allowNull: false,
      },
      label: { type: DataTypes.STRING(255), allowNull: false },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_default",
      },
      meta: { type: DataTypes.JSONB, allowNull: true },
    },
    {
      tableName: "payment_methods",
      underscored: true,
      timestamps: true,
    },
  );

  PaymentMethod.associate = (db) => {
    PaymentMethod.belongsTo(db.User, { foreignKey: "user_id", as: "user" });
  };

  return PaymentMethod;
};
