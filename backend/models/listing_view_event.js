"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ListingViewEvent extends Model {}
  ListingViewEvent.init({
    listing_id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    visitor_key: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    viewed_on: { type: DataTypes.DATEONLY, primaryKey: true, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { sequelize, modelName: "ListingViewEvent", tableName: "listing_view_events", timestamps: false });
  return ListingViewEvent;
};
