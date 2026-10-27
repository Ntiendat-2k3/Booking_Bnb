"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("listings", "cancellation_policy_code", {
        type: S.STRING(20), allowNull: false, defaultValue: "moderate",
      }, { transaction });
      await queryInterface.addColumn("bookings", "cancellation_policy_snapshot", {
        type: S.JSONB, allowNull: true,
      }, { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE listings ADD CONSTRAINT listings_cancellation_policy_check CHECK (cancellation_policy_code IN ('flexible', 'moderate', 'strict'))",
        { transaction },
      );
      await queryInterface.createTable("booking_cancellations", {
        id: { type: S.UUID, primaryKey: true, defaultValue: S.UUIDV4 },
        booking_id: { type: S.UUID, allowNull: false, unique: true, references: { model: "bookings", key: "id" }, onDelete: "RESTRICT" },
        actor_id: { type: S.UUID, allowNull: false, references: { model: "users", key: "id" }, onDelete: "RESTRICT" },
        policy_snapshot: { type: S.JSONB, allowNull: false },
        paid_amount: { type: S.BIGINT, allowNull: false },
        refund_amount: { type: S.BIGINT, allowNull: false },
        non_refundable_amount: { type: S.BIGINT, allowNull: false },
        currency: { type: S.STRING(3), allowNull: false },
        reason: { type: S.STRING(500) },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
      await queryInterface.createTable("refunds", {
        id: { type: S.UUID, primaryKey: true, defaultValue: S.UUIDV4 },
        booking_id: { type: S.UUID, allowNull: false, references: { model: "bookings", key: "id" }, onDelete: "RESTRICT" },
        payment_id: { type: S.UUID, allowNull: false, references: { model: "payments", key: "id" }, onDelete: "RESTRICT" },
        cancellation_id: { type: S.UUID, references: { model: "booking_cancellations", key: "id" }, onDelete: "RESTRICT" },
        source_key: { type: S.STRING(130), allowNull: false, unique: true },
        amount: { type: S.BIGINT, allowNull: false },
        currency: { type: S.STRING(3), allowNull: false },
        status: { type: S.STRING(20), allowNull: false, defaultValue: "requested" },
        stripe_refund_id: { type: S.STRING(255), unique: true },
        attempt: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        failure_reason: { type: S.STRING(500) },
        admin_note: { type: S.TEXT },
        provider_updated_at: { type: S.DATE },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
      await queryInterface.addIndex("refunds", ["status", "created_at"], { transaction });
      await queryInterface.addIndex("refunds", ["payment_id"], { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE refunds ADD CONSTRAINT refunds_status_check CHECK (status IN ('requested', 'processing', 'succeeded', 'failed', 'manual_review'))",
        { transaction },
      );
      await queryInterface.createTable("refund_events", {
        id: { type: S.UUID, primaryKey: true, defaultValue: S.UUIDV4 },
        refund_id: { type: S.UUID, allowNull: false, references: { model: "refunds", key: "id" }, onDelete: "RESTRICT" },
        actor_id: { type: S.UUID, references: { model: "users", key: "id" }, onDelete: "SET NULL" },
        provider_event_id: { type: S.STRING(255), unique: true },
        action: { type: S.STRING(30), allowNull: false },
        note: { type: S.TEXT },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
      await queryInterface.addIndex("refund_events", ["refund_id", "created_at"], { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("refund_events", { transaction });
      await queryInterface.dropTable("refunds", { transaction });
      await queryInterface.dropTable("booking_cancellations", { transaction });
      await queryInterface.removeColumn("bookings", "cancellation_policy_snapshot", { transaction });
      await queryInterface.sequelize.query("ALTER TABLE listings DROP CONSTRAINT listings_cancellation_policy_check", { transaction });
      await queryInterface.removeColumn("listings", "cancellation_policy_code", { transaction });
    });
  },
};
