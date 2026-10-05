"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UploadedAsset extends Model {}

  UploadedAsset.init(
    {
      public_id: { type: DataTypes.TEXT, primaryKey: true },
      user_id: { type: DataTypes.UUID, allowNull: false },
      listing_id: { type: DataTypes.UUID, allowNull: true },
      metadata: { type: DataTypes.JSONB, allowNull: false },
      attached_at: { type: DataTypes.DATE, allowNull: true },
      delete_requested: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "UploadedAsset",
      tableName: "uploaded_assets",
      createdAt: "created_at",
      updatedAt: false,
    },
  );

  return UploadedAsset;
};
