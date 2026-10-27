"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable("listing_pricing_rules", {
        id: { type: S.UUID, primaryKey: true, defaultValue: S.UUIDV4 },
        listing_id: { type: S.UUID, allowNull: false, references: { model: "listings", key: "id" }, onDelete: "CASCADE" },
        kind: { type: S.STRING(16), allowNull: false },
        weekday: { type: S.INTEGER },
        start_date: { type: S.DATEONLY },
        end_date: { type: S.DATEONLY },
        name: { type: S.STRING(120) },
        price_per_night: { type: S.BIGINT },
        min_nights: { type: S.INTEGER },
        max_nights: { type: S.INTEGER },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
      await queryInterface.createTable("listing_daily_prices", {
        id: { type: S.UUID, primaryKey: true, defaultValue: S.UUIDV4 },
        listing_id: { type: S.UUID, allowNull: false, references: { model: "listings", key: "id" }, onDelete: "CASCADE" },
        date: { type: S.DATEONLY, allowNull: false },
        price_per_night: { type: S.BIGINT, allowNull: false },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
      await queryInterface.addIndex("listing_pricing_rules", ["listing_id", "start_date", "end_date"], { transaction });
      await queryInterface.addIndex("listing_pricing_rules", ["listing_id", "weekday"], {
        unique: true, where: { kind: "weekday" }, transaction,
      });
      await queryInterface.addIndex("listing_daily_prices", ["listing_id", "date"], { unique: true, transaction });
      await queryInterface.addColumn("bookings", "price_breakdown_snapshot", { type: S.JSONB }, { transaction });
      await queryInterface.sequelize.query(`
        ALTER TABLE listing_pricing_rules ADD CONSTRAINT listing_pricing_rules_valid CHECK (
          kind IN ('weekday', 'range', 'season', 'holiday')
          AND (price_per_night IS NULL OR price_per_night > 0)
          AND (min_nights IS NULL OR min_nights BETWEEN 1 AND 365)
          AND (max_nights IS NULL OR max_nights BETWEEN 1 AND 365)
          AND (min_nights IS NULL OR max_nights IS NULL OR min_nights <= max_nights)
          AND ((kind = 'weekday' AND weekday IN (0, 5, 6) AND start_date IS NULL AND end_date IS NULL
            AND price_per_night IS NOT NULL AND min_nights IS NULL AND max_nights IS NULL)
            OR (kind <> 'weekday' AND weekday IS NULL AND start_date < end_date
              AND (price_per_night IS NOT NULL OR min_nights IS NOT NULL OR max_nights IS NOT NULL)))
        );
        ALTER TABLE listing_daily_prices ADD CONSTRAINT listing_daily_prices_positive CHECK (price_per_night > 0);
      `, { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("bookings", "price_breakdown_snapshot", { transaction });
      await queryInterface.dropTable("listing_daily_prices", { transaction });
      await queryInterface.dropTable("listing_pricing_rules", { transaction });
    });
  },
};
