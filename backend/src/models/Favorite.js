const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Favorite = sequelize.define(
    "Favorite",
    {
      userId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        field: "user_id",
      },
      listingId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        field: "listing_id",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
    },
    {
      tableName: "favorites",
      underscored: true,
      timestamps: false,
    },
  );

  return Favorite;
};
