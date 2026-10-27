"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const ref = (table, onDelete = "CASCADE") => ({ type: S.UUID, allowNull: false,
        references: { model: table, key: "id" }, onUpdate: "CASCADE", onDelete });
      const optionalRef = (table) => ({ type: S.UUID, allowNull: true,
        references: { model: table, key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL" });
      const timestamp = { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") };
      await queryInterface.createTable("booking_proposals", {
        id: { type: S.UUID, defaultValue: S.UUIDV4, primaryKey: true },
        conversation_id: ref("chat_conversations"),
        message_id: optionalRef("chat_messages"),
        // Giữ mã phòng trong lịch sử đề xuất sau khi chủ nhà xóa vĩnh viễn listing chưa có booking.
        listing_id: { type: S.UUID, allowNull: false },
        created_by: ref("users", "RESTRICT"),
        customer_id: ref("users", "RESTRICT"),
        client_key: { type: S.UUID, allowNull: false },
        status: { type: S.STRING(40), allowNull: false },
        version: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        check_in: { type: S.DATEONLY, allowNull: false },
        check_out: { type: S.DATEONLY, allowNull: false },
        guests_count: { type: S.INTEGER, allowNull: false },
        special_requests: { type: S.STRING(500) },
        change_request: { type: S.STRING(500) },
        listing_snapshot: { type: S.JSONB, allowNull: false },
        price_per_night_snapshot: { type: S.BIGINT, allowNull: false },
        total_amount_snapshot: { type: S.BIGINT, allowNull: false },
        currency: { type: S.STRING(3), allowNull: false, defaultValue: "VND" },
        failure_reason: { type: S.STRING(40) },
        confirmed_by: optionalRef("users"),
        confirmed_at: { type: S.DATE },
        created_booking_id: optionalRef("bookings"),
        created_at: timestamp,
        updated_at: timestamp,
      }, { transaction });
      await queryInterface.addIndex("booking_proposals", ["created_by", "client_key"],
        { unique: true, transaction });
      await queryInterface.addIndex("booking_proposals", ["message_id"],
        { unique: true, transaction });
      await queryInterface.addIndex("booking_proposals", ["created_booking_id"],
        { unique: true, transaction });
      await queryInterface.addIndex("booking_proposals", ["conversation_id", "created_at"],
        { transaction });
      await queryInterface.createTable("booking_proposal_events", {
        id: { type: S.UUID, defaultValue: S.UUIDV4, primaryKey: true },
        proposal_id: ref("booking_proposals"),
        actor_id: ref("users", "RESTRICT"),
        event: { type: S.STRING(40), allowNull: false },
        version: { type: S.INTEGER, allowNull: false },
        metadata: { type: S.JSONB, allowNull: false, defaultValue: {} },
        created_at: timestamp,
      }, { transaction });
      await queryInterface.addIndex("booking_proposal_events", ["proposal_id", "created_at"],
        { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("booking_proposal_events", { transaction });
      await queryInterface.dropTable("booking_proposals", { transaction });
    });
  },
};
