"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
      Booking.belongsTo(models.Listing, {
        foreignKey: "listing_id",
        as: "listing",
      });
      Booking.belongsTo(models.User, { foreignKey: "guest_id", as: "guest" });

      Booking.hasMany(models.Payment, {
        foreignKey: "booking_id",
        as: "payments",
      });
      Booking.hasOne(models.Review, { foreignKey: "booking_id", as: "review" });
    }
  }

  Booking.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      listing_id: { type: DataTypes.UUID, allowNull: false },
      guest_id: { type: DataTypes.UUID, allowNull: false },

      check_in: { type: DataTypes.DATEONLY, allowNull: false },
      check_out: { type: DataTypes.DATEONLY, allowNull: false },
      guests_count: { type: DataTypes.INTEGER, allowNull: false },

      status: {
        type: DataTypes.ENUM(
          "pending_payment",
          "confirmed",
          "cancelled",
          "completed",
        ),
        allowNull: false,
        defaultValue: "pending_payment",
      },

      price_per_night_snapshot: { type: DataTypes.BIGINT, allowNull: false },
      total_amount: { type: DataTypes.BIGINT, allowNull: false },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "VND",
      },
    },
    {
      sequelize,
      modelName: "Booking",
      tableName: "bookings",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return Booking;
};
