const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ListingImage = sequelize.define(
    "ListingImage",
    {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      listingId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "listing_id",
      },
      url: { type: DataTypes.TEXT, allowNull: false },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "sort_order",
      },
      isCover: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_cover",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
    },
    {
      tableName: "listing_images",
      underscored: true,
      timestamps: false,
    },
  );

  ListingImage.associate = (db) => {
    ListingImage.belongsTo(db.Listing, {
      foreignKey: "listing_id",
      as: "listing",
    });
  };

  return ListingImage;
};
