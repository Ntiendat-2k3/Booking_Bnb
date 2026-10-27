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
      Booking.hasOne(models.BookingProposal, {
        foreignKey: "created_booking_id",
        as: "bookingProposal",
      });

      Booking.hasMany(models.Payment, {
        foreignKey: "booking_id",
        as: "payments",
      });
      Booking.hasOne(models.PaymentCollection, { foreignKey: "booking_id", as: "paymentCollection" });
      Booking.hasOne(models.BookingCancellation, { foreignKey: "booking_id", as: "cancellation" });
      Booking.hasMany(models.Refund, { foreignKey: "booking_id", as: "refunds" });
      Booking.hasMany(models.PaymentDispute, { foreignKey: "booking_id", as: "disputes" });
      Booking.hasOne(models.Review, { foreignKey: "booking_id", as: "review" });
      Booking.hasMany(models.BookingStayEvent, { foreignKey: "booking_id", as: "stayEvents" });
    }
  }

  Booking.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      reference_number: { type: DataTypes.BIGINT, autoIncrement: true, allowNull: false, unique: true },
      listing_id: { type: DataTypes.UUID, allowNull: false },
      guest_id: { type: DataTypes.UUID, allowNull: false },
      renter_name: { type: DataTypes.STRING(255), allowNull: true },
      renter_phone: { type: DataTypes.STRING(30), allowNull: true },

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
      stay_status: {
        type: DataTypes.STRING(20), allowNull: false, defaultValue: "not_checked_in",
        validate: { isIn: [["not_checked_in", "checked_in", "checked_out", "no_show"]] },
      },
      payment_method: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "stripe" },
      confirmation_email_queued_at: { type: DataTypes.DATE },
      actual_check_in_at: { type: DataTypes.DATE },
      actual_check_out_at: { type: DataTypes.DATE },
      checked_in_by: { type: DataTypes.UUID },
      checked_out_by: { type: DataTypes.UUID },

      price_per_night_snapshot: { type: DataTypes.BIGINT, allowNull: false },
      price_breakdown_snapshot: { type: DataTypes.JSONB },
      cancellation_policy_snapshot: { type: DataTypes.JSONB, allowNull: false },
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
