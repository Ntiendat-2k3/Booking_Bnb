const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      passwordHash: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: "password_hash",
      },
      fullName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "full_name",
      },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      avatarUrl: { type: DataTypes.TEXT, allowNull: true, field: "avatar_url" },
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
    },
    {
      tableName: "users",
      underscored: true,
      timestamps: true,
    },
  );

  User.associate = (db) => {
    User.hasMany(db.RefreshToken, {
      foreignKey: "user_id",
      as: "refreshTokens",
    });
    User.hasOne(db.UserSetting, { foreignKey: "user_id", as: "settings" });
    User.hasMany(db.PaymentMethod, {
      foreignKey: "user_id",
      as: "paymentMethods",
    });

    User.hasMany(db.Listing, { foreignKey: "host_id", as: "hostListings" });
    User.hasMany(db.Booking, { foreignKey: "guest_id", as: "bookings" });
    User.hasMany(db.Review, { foreignKey: "reviewer_id", as: "reviews" });

    User.belongsToMany(db.Listing, {
      through: db.Favorite,
      foreignKey: "user_id",
      otherKey: "listing_id",
      as: "favoriteListings",
    });
  };

  return User;
};
