"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class BookingProposalEvent extends Model {}
  BookingProposalEvent.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    proposal_id: { type: DataTypes.UUID, allowNull: false },
    actor_id: { type: DataTypes.UUID, allowNull: false },
    event: { type: DataTypes.STRING(40), allowNull: false },
    version: { type: DataTypes.INTEGER, allowNull: false },
    metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  }, { sequelize, modelName: "BookingProposalEvent", tableName: "booking_proposal_events",
    createdAt: "created_at", updatedAt: false });
  return BookingProposalEvent;
};
