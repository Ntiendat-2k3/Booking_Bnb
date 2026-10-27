"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable("listing_calendar_blocks", {
        id: { type: S.UUID, primaryKey: true, defaultValue: S.UUIDV4 },
        listing_id: { type: S.UUID, allowNull: false, references: { model: "listings", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
        start_date: { type: S.DATEONLY, allowNull: false },
        end_date: { type: S.DATEONLY, allowNull: false },
        reason: { type: S.STRING(255), allowNull: true },
        created_by: { type: S.UUID, allowNull: false, references: { model: "users", key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT" },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
      await queryInterface.addIndex("listing_calendar_blocks", ["listing_id", "start_date", "end_date"], { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE listing_calendar_blocks ADD CONSTRAINT listing_calendar_blocks_dates_check CHECK (start_date < end_date)",
        { transaction },
      );
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("listing_calendar_blocks");
  },
};
