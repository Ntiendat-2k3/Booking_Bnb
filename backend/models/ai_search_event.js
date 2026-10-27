"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AiSearchEvent extends Model {
    static associate(models) {
      AiSearchEvent.belongsTo(models.Booking, { foreignKey: "booking_id", as: "booking" });
      AiSearchEvent.belongsTo(models.AiSearchSession, { foreignKey: "search_id", as: "searchSession" });
    }
  }
  AiSearchEvent.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    search_id: { type: DataTypes.UUID, allowNull: false },
    listing_id: { type: DataTypes.UUID, allowNull: false },
    booking_id: { type: DataTypes.UUID, allowNull: true },
    event_type: { type: DataTypes.STRING(12), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false },
  }, { sequelize, modelName: "AiSearchEvent", tableName: "ai_search_events", timestamps: false });
  return AiSearchEvent;
};
