"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ListingDailyPrice extends Model {}
  ListingDailyPrice.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    listing_id: { type: DataTypes.UUID, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    price_per_night: { type: DataTypes.BIGINT, allowNull: false },
  }, {
    sequelize, modelName: "ListingDailyPrice", tableName: "listing_daily_prices",
    createdAt: "created_at", updatedAt: "updated_at",
  });
  return ListingDailyPrice;
};
