"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ai_search_sessions", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      criteria: { type: Sequelize.JSONB, allowNull: false },
      result_ids: { type: Sequelize.JSONB, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.createTable("ai_search_events", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      search_id: { type: Sequelize.UUID, allowNull: false, references: { model: "ai_search_sessions", key: "id" }, onDelete: "CASCADE" },
      listing_id: { type: Sequelize.UUID, allowNull: false, references: { model: "listings", key: "id" }, onDelete: "CASCADE" },
      booking_id: { type: Sequelize.UUID, allowNull: true, unique: true, references: { model: "bookings", key: "id" }, onDelete: "SET NULL" },
      event_type: { type: Sequelize.STRING(12), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("ai_search_sessions", ["created_at"]);
    await queryInterface.addIndex("ai_search_events", ["search_id", "event_type"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("ai_search_events");
    await queryInterface.dropTable("ai_search_sessions");
  },
};
