const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Amenity = sequelize.define(
    "Amenity",
    {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING(120), allowNull: false },
      slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      group: { type: DataTypes.STRING(120), allowNull: true, field: "group" },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "is_active",
      },
    },
    {
      tableName: "amenities",
      underscored: true,
      timestamps: true,
    },
  );

  Amenity.associate = (db) => {
    Amenity.belongsToMany(db.Listing, {
      through: db.ListingAmenity,
      foreignKey: "amenity_id",
      otherKey: "listing_id",
      as: "listings",
    });
  };

  return Amenity;
};
