const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Review = sequelize.define(
    "Review",
    {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      bookingId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        field: "booking_id",
      },
      listingId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "listing_id",
      },
      reviewerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "reviewer_id",
      },

      rating: { type: DataTypes.INTEGER, allowNull: false },
      comment: { type: DataTypes.TEXT, allowNull: true },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
    },
    {
      tableName: "reviews",
      underscored: true,
      timestamps: false,
    },
  );

  Review.associate = (db) => {
    Review.belongsTo(db.Booking, { foreignKey: "booking_id", as: "booking" });
    Review.belongsTo(db.Listing, { foreignKey: "listing_id", as: "listing" });
    Review.belongsTo(db.User, { foreignKey: "reviewer_id", as: "reviewer" });
  };

  return Review;
};
