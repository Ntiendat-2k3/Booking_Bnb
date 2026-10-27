"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ListingCalendarBlock extends Model {
    static associate(models) {
      ListingCalendarBlock.belongsTo(models.Listing, { foreignKey: "listing_id", as: "listing" });
      ListingCalendarBlock.belongsTo(models.User, { foreignKey: "created_by", as: "creator" });
    }
  }

  ListingCalendarBlock.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    listing_id: { type: DataTypes.UUID, allowNull: false },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: false },
    reason: { type: DataTypes.STRING(255) },
    created_by: { type: DataTypes.UUID, allowNull: false },
  }, {
    sequelize,
    modelName: "ListingCalendarBlock",
    tableName: "listing_calendar_blocks",
    createdAt: "created_at",
    updatedAt: false,
  });
  return ListingCalendarBlock;
};
