"use strict";

module.exports = {
  async up(queryInterface, S) {
    // PostgreSQL yêu cầu giá trị enum mới được commit trước khi dùng trong transaction.
    await queryInterface.sequelize.query("ALTER TYPE enum_payments_provider ADD VALUE IF NOT EXISTS 'property'");
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("listings", "allow_pay_at_property", {
        type: S.BOOLEAN, allowNull: false, defaultValue: false,
      }, { transaction });
      await queryInterface.addColumn("bookings", "payment_method", {
        type: S.STRING(20), allowNull: false, defaultValue: "stripe",
      }, { transaction });
      await queryInterface.addColumn("bookings", "confirmation_email_queued_at", { type: S.DATE }, { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE bookings ADD CONSTRAINT bookings_payment_method_check CHECK (payment_method IN ('stripe', 'property'))",
        { transaction },
      );
      await queryInterface.sequelize.query("ALTER TABLE bookings DROP CONSTRAINT bookings_stay_status_check", { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE bookings ADD CONSTRAINT bookings_stay_status_check CHECK (stay_status IN ('not_checked_in', 'checked_in', 'checked_out', 'no_show'))",
        { transaction },
      );
      await queryInterface.sequelize.query("ALTER TABLE booking_stay_events DROP CONSTRAINT booking_stay_events_action_check", { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE booking_stay_events ADD CONSTRAINT booking_stay_events_action_check CHECK (action IN ('qr_issued', 'checked_in', 'checked_out', 'no_show'))",
        { transaction },
      );
      await queryInterface.sequelize.query("ALTER TABLE booking_stay_tokens DROP CONSTRAINT booking_stay_tokens_purpose_check", { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE booking_stay_tokens ADD CONSTRAINT booking_stay_tokens_purpose_check CHECK (purpose IN ('check_in', 'check_out', 'verify'))",
        { transaction },
      );
      await queryInterface.createTable("payment_collections", {
        id: { type: S.UUID, primaryKey: true, defaultValue: S.UUIDV4 },
        booking_id: { type: S.UUID, allowNull: false, unique: true, references: { model: "bookings", key: "id" }, onDelete: "RESTRICT" },
        payment_id: { type: S.UUID, allowNull: false, unique: true, references: { model: "payments", key: "id" }, onDelete: "RESTRICT" },
        amount: { type: S.BIGINT, allowNull: false },
        currency: { type: S.STRING(3), allowNull: false },
        method: { type: S.STRING(20), allowNull: false },
        external_ref: { type: S.STRING(255) },
        collected_by: { type: S.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "RESTRICT" },
        collected_at: { type: S.DATE, allowNull: false },
        reconciled_by: { type: S.UUID, references: { model: "users", key: "id" }, onDelete: "SET NULL" },
        reconciled_at: { type: S.DATE },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE payment_collections ADD CONSTRAINT payment_collections_method_check CHECK (method IN ('cash', 'bank_transfer'))",
        { transaction },
      );
      await queryInterface.addIndex("payment_collections", ["collected_at", "reconciled_at"], { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("payment_collections", { transaction });
      await queryInterface.sequelize.query("ALTER TABLE booking_stay_tokens DROP CONSTRAINT booking_stay_tokens_purpose_check", { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE booking_stay_tokens ADD CONSTRAINT booking_stay_tokens_purpose_check CHECK (purpose IN ('check_in', 'check_out'))", { transaction });
      await queryInterface.sequelize.query("ALTER TABLE booking_stay_events DROP CONSTRAINT booking_stay_events_action_check", { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE booking_stay_events ADD CONSTRAINT booking_stay_events_action_check CHECK (action IN ('qr_issued', 'checked_in', 'checked_out'))", { transaction });
      await queryInterface.sequelize.query("ALTER TABLE bookings DROP CONSTRAINT bookings_stay_status_check", { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE bookings ADD CONSTRAINT bookings_stay_status_check CHECK (stay_status IN ('not_checked_in', 'checked_in', 'checked_out'))", { transaction });
      await queryInterface.sequelize.query("ALTER TABLE bookings DROP CONSTRAINT bookings_payment_method_check", { transaction });
      await queryInterface.removeColumn("bookings", "confirmation_email_queued_at", { transaction });
      await queryInterface.removeColumn("bookings", "payment_method", { transaction });
      await queryInterface.removeColumn("listings", "allow_pay_at_property", { transaction });
    });
  },
};
