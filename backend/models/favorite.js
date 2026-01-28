"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Favorite extends Model {
    static associate() {}
  }

  Favorite.init(
    {
      user_id: { type: DataTypes.UUID, primaryKey: true },
      listing_id: { type: DataTypes.UUID, primaryKey: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: "Favorite",
      tableName: "favorites",
      timestamps: false,
    },
  );

  return Favorite;
};
