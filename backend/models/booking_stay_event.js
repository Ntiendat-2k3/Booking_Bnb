"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BookingStayEvent extends Model {
    static associate(models) {
      BookingStayEvent.belongsTo(models.Booking, { foreignKey: "booking_id", as: "booking" });
      BookingStayEvent.belongsTo(models.User, { foreignKey: "actor_id", as: "actor" });
    }
  }

  BookingStayEvent.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    booking_id: { type: DataTypes.UUID, allowNull: false },
    listing_id: { type: DataTypes.UUID, allowNull: false },
    actor_id: { type: DataTypes.UUID, allowNull: false },
    action: { type: DataTypes.STRING(20), allowNull: false },
    method: { type: DataTypes.STRING(12), allowNull: false },
    reason: { type: DataTypes.TEXT },
    token_id: { type: DataTypes.UUID },
  }, {
    sequelize, modelName: "BookingStayEvent", tableName: "booking_stay_events",
    createdAt: "created_at", updatedAt: false,
  });
  return BookingStayEvent;
};
