"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ListingAmenity extends Model {
    static associate() {}
  }

  ListingAmenity.init(
    {
      listing_id: { type: DataTypes.UUID, primaryKey: true },
      amenity_id: { type: DataTypes.UUID, primaryKey: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: "ListingAmenity",
      tableName: "listing_amenities",
      timestamps: false,
    },
  );

  return ListingAmenity;
};
