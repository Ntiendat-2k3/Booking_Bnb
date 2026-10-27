"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ListingPricingRule extends Model {}
  ListingPricingRule.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    listing_id: { type: DataTypes.UUID, allowNull: false },
    kind: { type: DataTypes.STRING(16), allowNull: false },
    weekday: { type: DataTypes.INTEGER },
    start_date: { type: DataTypes.DATEONLY },
    end_date: { type: DataTypes.DATEONLY },
    name: { type: DataTypes.STRING(120) },
    price_per_night: { type: DataTypes.BIGINT },
    min_nights: { type: DataTypes.INTEGER },
    max_nights: { type: DataTypes.INTEGER },
  }, {
    sequelize, modelName: "ListingPricingRule", tableName: "listing_pricing_rules",
    createdAt: "created_at", updatedAt: "updated_at",
  });
  return ListingPricingRule;
};
