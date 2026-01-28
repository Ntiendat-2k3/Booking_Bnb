"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.RefreshToken, {
        foreignKey: "user_id",
        as: "refreshTokens",
      });
      User.hasOne(models.UserSetting, { foreignKey: "user_id", as: "setting" });
      User.hasMany(models.PaymentMethod, {
        foreignKey: "user_id",
        as: "paymentMethods",
      });

      User.hasMany(models.Listing, {
        foreignKey: "host_id",
        as: "hostListings",
      });
      User.hasMany(models.Booking, { foreignKey: "guest_id", as: "bookings" });
      User.hasMany(models.Review, { foreignKey: "reviewer_id", as: "reviews" });

      User.belongsToMany(models.Listing, {
        through: models.Favorite,
        foreignKey: "user_id",
        otherKey: "listing_id",
        as: "favoriteListings",
      });
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      password_hash: { type: DataTypes.TEXT, allowNull: true },

      full_name: { type: DataTypes.STRING(255), allowNull: false },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      avatar_url: { type: DataTypes.TEXT, allowNull: true },

      role: {
        type: DataTypes.ENUM("guest", "host", "admin"),
        allowNull: false,
        defaultValue: "guest",
      },
      status: {
        type: DataTypes.ENUM("active", "blocked"),
        allowNull: false,
        defaultValue: "active",
      },

      provider: {
        type: DataTypes.ENUM("local", "google"),
        allowNull: false,
        defaultValue: "local",
      },
      provider_id: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return User;
};
