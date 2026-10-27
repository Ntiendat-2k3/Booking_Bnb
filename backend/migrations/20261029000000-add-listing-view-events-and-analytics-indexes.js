"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable("listing_view_events", {
        listing_id: { type: S.UUID, allowNull: false, primaryKey: true,
          references: { model: "listings", key: "id" }, onDelete: "CASCADE" },
        visitor_key: { type: S.UUID, allowNull: false, primaryKey: true },
        viewed_on: { type: S.DATEONLY, allowNull: false, primaryKey: true },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
      await queryInterface.addIndex("listing_view_events", ["viewed_on", "listing_id"],
        { name: "listing_view_events_day_listing", transaction });
      await queryInterface.addIndex("payments", ["status", "currency", "paid_at"],
        { name: "payments_analytics_paid", transaction });
      await queryInterface.addIndex("bookings", ["listing_id", "created_at", "status"],
        { name: "bookings_analytics_created", transaction });
      await queryInterface.addIndex("bookings", ["listing_id", "check_in", "check_out"],
        { name: "bookings_analytics_stay", transaction });
      await queryInterface.addIndex("refunds", ["status", "provider_updated_at"],
        { name: "refunds_analytics_settled", transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("refunds", "refunds_analytics_settled", { transaction });
      await queryInterface.removeIndex("bookings", "bookings_analytics_stay", { transaction });
      await queryInterface.removeIndex("bookings", "bookings_analytics_created", { transaction });
      await queryInterface.removeIndex("payments", "payments_analytics_paid", { transaction });
      await queryInterface.dropTable("listing_view_events", { transaction });
    });
  },
};
