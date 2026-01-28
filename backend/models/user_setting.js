"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserSetting extends Model {
    static associate(models) {
      UserSetting.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    }
  }

  UserSetting.init(
    {
      user_id: { type: DataTypes.UUID, primaryKey: true },

      show_profile: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      show_reviews: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      marketing_emails: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      updated_at: { type: DataTypes.DATE, allowNull: false },
    },
    {
      sequelize,
      modelName: "UserSetting",
      tableName: "user_settings",
      timestamps: false,
    },
  );

  return UserSetting;
};
