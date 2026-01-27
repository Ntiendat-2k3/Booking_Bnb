const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Booking = sequelize.define(
    "Booking",
    {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      listingId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "listing_id",
      },
      guestId: { type: DataTypes.UUID, allowNull: false, field: "guest_id" },

      checkIn: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "check_in",
      },
      checkOut: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "check_out",
      },
      guestsCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "guests_count",
      },

      status: {
        type: DataTypes.ENUM(
          "pending_payment",
          "confirmed",
          "cancelled",
          "completed",
        ),
        allowNull: false,
        defaultValue: "pending_payment",
      },

      pricePerNightSnapshot: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: "price_per_night_snapshot",
      },
      totalAmount: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: "total_amount",
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "VND",
      },
    },
    {
      tableName: "bookings",
      underscored: true,
      timestamps: true,
    },
  );

  Booking.associate = (db) => {
    Booking.belongsTo(db.Listing, { foreignKey: "listing_id", as: "listing" });
    Booking.belongsTo(db.User, { foreignKey: "guest_id", as: "guest" });

    Booking.hasMany(db.Payment, { foreignKey: "booking_id", as: "payments" });
    Booking.hasOne(db.Review, { foreignKey: "booking_id", as: "review" });
  };

  return Booking;
};
