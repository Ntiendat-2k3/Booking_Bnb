const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const UserSetting = sequelize.define(
    "UserSetting",
    {
      userId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        field: "user_id",
      },
      showProfile: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "show_profile",
      },
      showReviews: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "show_reviews",
      },
      marketingEmails: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "marketing_emails",
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "updated_at",
      },
    },
    {
      tableName: "user_settings",
      underscored: true,
      timestamps: false,
    },
  );

  UserSetting.associate = (db) => {
    UserSetting.belongsTo(db.User, { foreignKey: "user_id", as: "user" });
  };

  return UserSetting;
};
