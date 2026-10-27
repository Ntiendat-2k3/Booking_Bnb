"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("bookings", "renter_name", {
        type: S.STRING(255), allowNull: true,
      }, { transaction });
      await queryInterface.addColumn("bookings", "renter_phone", {
        type: S.STRING(30), allowNull: true,
      }, { transaction });
      // Chụp dữ liệu hiện có một lần để thay đổi hồ sơ sau này không làm lệch thông tin booking cũ.
      await queryInterface.sequelize.query(`
        UPDATE bookings AS b
        SET renter_name = u.full_name, renter_phone = u.phone
        FROM users AS u
        WHERE b.guest_id = u.id
      `, { transaction });
      await queryInterface.sequelize.query(`
        UPDATE bookings AS b
        SET renter_name = COALESCE(p.renter_name, b.renter_name),
            renter_phone = COALESCE(p.renter_phone, b.renter_phone)
        FROM booking_proposals AS p
        WHERE p.created_booking_id = b.id
      `, { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("bookings", "renter_phone", { transaction });
      await queryInterface.removeColumn("bookings", "renter_name", { transaction });
    });
  },
};
