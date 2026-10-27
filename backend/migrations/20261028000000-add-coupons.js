"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable("coupons", {
        id: { type: S.UUID, primaryKey: true, defaultValue: S.UUIDV4 },
        code: { type: S.STRING(40), allowNull: false, unique: true },
        campaign_name: { type: S.STRING(120), allowNull: false },
        created_by: { type: S.UUID, allowNull: false, references: { model: "users", key: "id" } },
        listing_id: { type: S.UUID, references: { model: "listings", key: "id" }, onDelete: "CASCADE" },
        host_id: { type: S.UUID, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
        city: { type: S.STRING(120) },
        audience: { type: S.STRING(20), allowNull: false, defaultValue: "all" },
        discount_type: { type: S.STRING(20), allowNull: false },
        discount_value: { type: S.BIGINT, allowNull: false },
        max_discount: { type: S.BIGINT },
        min_subtotal: { type: S.BIGINT, allowNull: false, defaultValue: 0 },
        starts_at: { type: S.DATE, allowNull: false },
        ends_at: { type: S.DATE, allowNull: false },
        max_total_uses: { type: S.INTEGER },
        max_uses_per_user: { type: S.INTEGER },
        active_uses: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
        is_active: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
      await queryInterface.createTable("coupon_redemptions", {
        id: { type: S.UUID, primaryKey: true, defaultValue: S.UUIDV4 },
        coupon_id: { type: S.UUID, allowNull: false, references: { model: "coupons", key: "id" } },
        booking_id: { type: S.UUID, allowNull: false, unique: true, references: { model: "bookings", key: "id" } },
        user_id: { type: S.UUID, allowNull: false, references: { model: "users", key: "id" } },
        status: { type: S.STRING(16), allowNull: false },
        subtotal_snapshot: { type: S.BIGINT, allowNull: false },
        discount_amount: { type: S.BIGINT, allowNull: false },
        redeemed_at: { type: S.DATE },
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") },
      }, { transaction });
      await queryInterface.addIndex("coupon_redemptions", ["coupon_id", "user_id", "status"], { transaction });
      await queryInterface.addIndex("coupons", ["campaign_name"], { transaction });
      await queryInterface.sequelize.query(`
        ALTER TABLE coupons ADD CONSTRAINT coupons_valid CHECK (
          code = UPPER(code) AND discount_type IN ('percent', 'fixed')
          AND audience IN ('all', 'new_guest', 'returning_guest') AND discount_value > 0
          AND (discount_type <> 'percent' OR discount_value <= 99)
          AND (max_discount IS NULL OR max_discount > 0) AND min_subtotal >= 0
          AND starts_at < ends_at AND active_uses >= 0
          AND (max_total_uses IS NULL OR max_total_uses > 0)
          AND (max_uses_per_user IS NULL OR max_uses_per_user > 0)
        );
        ALTER TABLE coupon_redemptions ADD CONSTRAINT coupon_redemptions_valid CHECK (
          status IN ('reserved', 'redeemed', 'released')
          AND subtotal_snapshot > 0 AND discount_amount > 0
        );
      `, { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("coupon_redemptions", { transaction });
      await queryInterface.dropTable("coupons", { transaction });
    });
  },
};
