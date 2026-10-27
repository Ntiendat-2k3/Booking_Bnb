"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BookingStayToken extends Model {
    static associate(models) {
      BookingStayToken.belongsTo(models.Booking, { foreignKey: "booking_id", as: "booking" });
    }
  }

  BookingStayToken.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    booking_id: { type: DataTypes.UUID, allowNull: false },
    purpose: { type: DataTypes.STRING(16), allowNull: false },
    token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    used_at: { type: DataTypes.DATE },
    revoked_at: { type: DataTypes.DATE },
  }, {
    sequelize, modelName: "BookingStayToken", tableName: "booking_stay_tokens",
    createdAt: "created_at", updatedAt: false,
  });
  return BookingStayToken;
};
