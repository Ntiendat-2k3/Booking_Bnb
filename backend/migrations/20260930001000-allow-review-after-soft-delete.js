"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addIndex("reviews", ["booking_id"], {
        name: "reviews_active_booking_id_unique",
        unique: true,
        where: { deleted_at: null },
        transaction,
      });
      await queryInterface.removeConstraint("reviews", "reviews_booking_id_key", { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Khôi phục ràng buộc cũ chỉ thành công khi chưa có nhiều bản ghi cùng booking.
      await queryInterface.addConstraint("reviews", {
        fields: ["booking_id"],
        type: "unique",
        name: "reviews_booking_id_key",
        transaction,
      });
      await queryInterface.removeIndex("reviews", "reviews_active_booking_id_unique", { transaction });
    });
  },
};
