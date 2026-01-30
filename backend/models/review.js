"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    static associate(models) {
      Review.belongsTo(models.Booking, {
        foreignKey: "booking_id",
        as: "booking",
      });
      Review.belongsTo(models.Listing, {
        foreignKey: "listing_id",
        as: "listing",
      });
      Review.belongsTo(models.User, {
        foreignKey: "reviewer_id",
        as: "reviewer",
      });
    }
  }

  Review.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      booking_id: { type: DataTypes.UUID, allowNull: false, unique: true },
      listing_id: { type: DataTypes.UUID, allowNull: false },
      reviewer_id: { type: DataTypes.UUID, allowNull: false },

      rating: { type: DataTypes.INTEGER, allowNull: false },
      comment: { type: DataTypes.TEXT, allowNull: true },

      // Sprint 6: moderation
      is_hidden: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      updated_at: { type: DataTypes.DATE, allowNull: true },

      created_at: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: "Review",
      tableName: "reviews",
      timestamps: false,
    },
  );

  return Review;
};
