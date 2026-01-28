"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ListingImage extends Model {
    static associate(models) {
      ListingImage.belongsTo(models.Listing, {
        foreignKey: "listing_id",
        as: "listing",
      });
    }
  }

  ListingImage.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      listing_id: { type: DataTypes.UUID, allowNull: false },

      url: { type: DataTypes.TEXT, allowNull: false },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_cover: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      created_at: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: "ListingImage",
      tableName: "listing_images",
      timestamps: false,
    },
  );

  return ListingImage;
};
