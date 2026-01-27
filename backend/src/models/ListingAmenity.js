const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ListingAmenity = sequelize.define(
    "ListingAmenity",
    {
      listingId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        field: "listing_id",
      },
      amenityId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        field: "amenity_id",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
    },
    {
      tableName: "listing_amenities",
      underscored: true,
      timestamps: false,
    },
  );

  return ListingAmenity;
};
