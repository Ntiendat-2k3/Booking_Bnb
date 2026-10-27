"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CouponRedemption extends Model {}
  CouponRedemption.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    coupon_id: { type: DataTypes.UUID, allowNull: false },
    booking_id: { type: DataTypes.UUID, allowNull: false, unique: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false },
    subtotal_snapshot: { type: DataTypes.BIGINT, allowNull: false },
    discount_amount: { type: DataTypes.BIGINT, allowNull: false },
    redeemed_at: { type: DataTypes.DATE },
  }, { sequelize, modelName: "CouponRedemption", tableName: "coupon_redemptions",
    createdAt: "created_at", updatedAt: "updated_at" });
  return CouponRedemption;
};
