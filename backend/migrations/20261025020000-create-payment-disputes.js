"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable("payment_disputes", {
        id: { type: S.UUID, primaryKey: true, defaultValue: S.UUIDV4 },
        booking_id: { type: S.UUID, allowNull: false, references: { model: "bookings", key: "id" }, onDelete: "RESTRICT" },
        payment_id: { type: S.UUID, allowNull: false, references: { model: "payments", key: "id" }, onDelete: "RESTRICT" },
        stripe_dispute_id: { type: S.STRING(255), allowNull: false, unique: true },
        amount: { type: S.BIGINT, allowNull: false },
        currency: { type: S.STRING(3), allowNull: false },
        provider_status: { type: S.STRING(40), allowNull: false },
        reason: { type: S.STRING(100) },
        evidence_due_at: { type: S.DATE },
        admin_note: { type: S.TEXT },
        reviewed_by: { type: S.UUID, references: { model: "users", key: "id" }, onDelete: "SET NULL" },
        reviewed_at: { type: S.DATE },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
      await queryInterface.addIndex("payment_disputes", ["provider_status", "created_at"], { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("payment_disputes");
  },
};
