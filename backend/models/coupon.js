"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Coupon extends Model {}
  Coupon.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    campaign_name: { type: DataTypes.STRING(120), allowNull: false },
    created_by: { type: DataTypes.UUID, allowNull: false },
    listing_id: { type: DataTypes.UUID },
    host_id: { type: DataTypes.UUID },
    city: { type: DataTypes.STRING(120) },
    audience: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "all" },
    discount_type: { type: DataTypes.STRING(20), allowNull: false },
    discount_value: { type: DataTypes.BIGINT, allowNull: false },
    max_discount: { type: DataTypes.BIGINT },
    min_subtotal: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    starts_at: { type: DataTypes.DATE, allowNull: false },
    ends_at: { type: DataTypes.DATE, allowNull: false },
    max_total_uses: { type: DataTypes.INTEGER },
    max_uses_per_user: { type: DataTypes.INTEGER },
    active_uses: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { sequelize, modelName: "Coupon", tableName: "coupons",
    createdAt: "created_at", updatedAt: "updated_at" });
  return Coupon;
};
