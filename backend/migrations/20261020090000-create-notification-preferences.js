"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.createTable("notification_preferences", {
      user_id: { type: S.UUID, allowNull: false, primaryKey: true,
        references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      messages: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
      bookings: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
      calls: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
      reminders: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
      offers: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("notification_preferences");
  },
};
