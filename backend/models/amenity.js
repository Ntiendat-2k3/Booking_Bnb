"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Amenity extends Model {
    static associate(models) {
      Amenity.belongsToMany(models.Listing, {
        through: models.ListingAmenity,
        foreignKey: "amenity_id",
        otherKey: "listing_id",
        as: "listings",
      });
    }
  }

  Amenity.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(120), allowNull: false },
      slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },

      group: { type: DataTypes.STRING(120), allowNull: true },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Amenity",
      tableName: "amenities",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return Amenity;
};
