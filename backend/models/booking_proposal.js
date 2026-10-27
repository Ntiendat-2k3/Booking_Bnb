"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BookingProposal extends Model {}
  BookingProposal.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    conversation_id: { type: DataTypes.UUID, allowNull: false },
    message_id: { type: DataTypes.UUID, unique: true },
    listing_id: { type: DataTypes.UUID, allowNull: false },
    created_by: { type: DataTypes.UUID, allowNull: false },
    customer_id: { type: DataTypes.UUID, allowNull: false },
    client_key: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.STRING(40), allowNull: false },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    check_in: { type: DataTypes.DATEONLY, allowNull: false },
    check_out: { type: DataTypes.DATEONLY, allowNull: false },
    guests_count: { type: DataTypes.INTEGER, allowNull: false },
    renter_name: { type: DataTypes.STRING(100), allowNull: true },
    renter_phone: { type: DataTypes.STRING(15), allowNull: true },
    special_requests: { type: DataTypes.STRING(500) },
    change_request: { type: DataTypes.STRING(500) },
    listing_snapshot: { type: DataTypes.JSONB, allowNull: false },
    price_per_night_snapshot: { type: DataTypes.BIGINT, allowNull: false },
    total_amount_snapshot: { type: DataTypes.BIGINT, allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "VND" },
    failure_reason: { type: DataTypes.STRING(40) },
    confirmed_by: { type: DataTypes.UUID },
    confirmed_at: { type: DataTypes.DATE },
    created_booking_id: { type: DataTypes.UUID, unique: true },
  }, { sequelize, modelName: "BookingProposal", tableName: "booking_proposals",
    createdAt: "created_at", updatedAt: "updated_at" });
  return BookingProposal;
};
