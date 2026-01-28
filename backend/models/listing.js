"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Listing extends Model {
    static associate(models) {
      Listing.belongsTo(models.User, { foreignKey: "host_id", as: "host" });

      Listing.hasMany(models.ListingImage, {
        foreignKey: "listing_id",
        as: "images",
      });
      Listing.hasMany(models.Booking, {
        foreignKey: "listing_id",
        as: "bookings",
      });
      Listing.hasMany(models.Review, {
        foreignKey: "listing_id",
        as: "reviews",
      });

      Listing.belongsToMany(models.Amenity, {
        through: models.ListingAmenity,
        foreignKey: "listing_id",
        otherKey: "amenity_id",
        as: "amenities",
      });

      Listing.belongsToMany(models.User, {
        through: models.Favorite,
        foreignKey: "listing_id",
        otherKey: "user_id",
        as: "favoritedByUsers",
      });
    }
  }

  Listing.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      host_id: { type: DataTypes.UUID, allowNull: false },

      title: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },

      address: { type: DataTypes.STRING(255), allowNull: true },
      city: { type: DataTypes.STRING(120), allowNull: false },
      country: { type: DataTypes.STRING(120), allowNull: false },
      lat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      lng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },

      property_type: { type: DataTypes.STRING(80), allowNull: true },
      room_type: { type: DataTypes.STRING(80), allowNull: true },

      price_per_night: { type: DataTypes.BIGINT, allowNull: false },
      max_guests: { type: DataTypes.INTEGER, allowNull: false },

      bedrooms: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      beds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      bathrooms: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: false,
        defaultValue: 0,
      },

      status: {
        type: DataTypes.ENUM("draft", "published", "paused"),
        allowNull: false,
        defaultValue: "draft",
      },

      deleted_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "Listing",
      tableName: "listings",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return Listing;
};
