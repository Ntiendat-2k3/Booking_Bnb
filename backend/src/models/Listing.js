const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Listing = sequelize.define(
    "Listing",
    {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      hostId: { type: DataTypes.UUID, allowNull: false, field: "host_id" },

      title: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },

      address: { type: DataTypes.STRING(255), allowNull: true },
      city: { type: DataTypes.STRING(120), allowNull: false },
      country: { type: DataTypes.STRING(120), allowNull: false },
      lat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      lng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },

      propertyType: {
        type: DataTypes.STRING(80),
        allowNull: true,
        field: "property_type",
      },
      roomType: {
        type: DataTypes.STRING(80),
        allowNull: true,
        field: "room_type",
      },

      pricePerNight: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: "price_per_night",
      },
      maxGuests: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "max_guests",
      },
      bedrooms: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      beds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      bathrooms: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: false,
        defaultValue: 0,
      },

      status: {
        type: DataTypes.ENUM("draft", "published", "paused"),
        allowNull: false,
        defaultValue: "draft",
      },

      deletedAt: { type: DataTypes.DATE, allowNull: true, field: "deleted_at" },
    },
    {
      tableName: "listings",
      underscored: true,
      timestamps: true,
      paranoid: true,
      deletedAt: "deleted_at",
    },
  );

  Listing.associate = (db) => {
    Listing.belongsTo(db.User, { foreignKey: "host_id", as: "host" });

    Listing.hasMany(db.ListingImage, {
      foreignKey: "listing_id",
      as: "images",
    });
    Listing.hasMany(db.Booking, { foreignKey: "listing_id", as: "bookings" });
    Listing.hasMany(db.Review, { foreignKey: "listing_id", as: "reviews" });

    Listing.belongsToMany(db.Amenity, {
      through: db.ListingAmenity,
      foreignKey: "listing_id",
      otherKey: "amenity_id",
      as: "amenities",
    });

    Listing.belongsToMany(db.User, {
      through: db.Favorite,
      foreignKey: "listing_id",
      otherKey: "user_id",
      as: "favoritedByUsers",
    });
  };

  return Listing;
};
