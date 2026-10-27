"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("bookings", "stay_status", {
        type: S.STRING(20), allowNull: false, defaultValue: "not_checked_in",
      }, { transaction });
      await queryInterface.addColumn("bookings", "actual_check_in_at", { type: S.DATE }, { transaction });
      await queryInterface.addColumn("bookings", "actual_check_out_at", { type: S.DATE }, { transaction });
      await queryInterface.addColumn("bookings", "checked_in_by", {
        type: S.UUID, references: { model: "users", key: "id" }, onDelete: "SET NULL",
      }, { transaction });
      await queryInterface.addColumn("bookings", "checked_out_by", {
        type: S.UUID, references: { model: "users", key: "id" }, onDelete: "SET NULL",
      }, { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE bookings ADD CONSTRAINT bookings_stay_status_check CHECK (stay_status IN ('not_checked_in', 'checked_in', 'checked_out'))",
        { transaction },
      );

      await queryInterface.createTable("booking_stay_tokens", {
        id: { type: S.UUID, primaryKey: true, defaultValue: S.UUIDV4 },
        booking_id: { type: S.UUID, allowNull: false, references: { model: "bookings", key: "id" }, onDelete: "CASCADE" },
        purpose: { type: S.STRING(16), allowNull: false },
        token_hash: { type: S.STRING(64), allowNull: false, unique: true },
        expires_at: { type: S.DATE, allowNull: false },
        used_at: { type: S.DATE },
        revoked_at: { type: S.DATE },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
      await queryInterface.addIndex("booking_stay_tokens", ["booking_id", "purpose", "expires_at"], { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE booking_stay_tokens ADD CONSTRAINT booking_stay_tokens_purpose_check CHECK (purpose IN ('check_in', 'check_out'))",
        { transaction },
      );

      await queryInterface.createTable("booking_stay_events", {
        id: { type: S.UUID, primaryKey: true, defaultValue: S.UUIDV4 },
        booking_id: { type: S.UUID, allowNull: false, references: { model: "bookings", key: "id" }, onDelete: "CASCADE" },
        listing_id: { type: S.UUID, allowNull: false, references: { model: "listings", key: "id" }, onDelete: "RESTRICT" },
        actor_id: { type: S.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "RESTRICT" },
        action: { type: S.STRING(20), allowNull: false },
        method: { type: S.STRING(12), allowNull: false },
        reason: { type: S.TEXT },
        token_id: { type: S.UUID, references: { model: "booking_stay_tokens", key: "id" }, onDelete: "SET NULL" },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
      await queryInterface.addIndex("booking_stay_events", ["booking_id", "created_at"], { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE booking_stay_events ADD CONSTRAINT booking_stay_events_action_check CHECK (action IN ('qr_issued', 'checked_in', 'checked_out'))",
        { transaction },
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE booking_stay_events ADD CONSTRAINT booking_stay_events_method_check CHECK (method IN ('qr', 'manual'))",
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("booking_stay_events", { transaction });
      await queryInterface.dropTable("booking_stay_tokens", { transaction });
      await queryInterface.sequelize.query("ALTER TABLE bookings DROP CONSTRAINT bookings_stay_status_check", { transaction });
      for (const column of ["checked_out_by", "checked_in_by", "actual_check_out_at", "actual_check_in_at", "stay_status"])
        await queryInterface.removeColumn("bookings", column, { transaction });
    });
  },
};
