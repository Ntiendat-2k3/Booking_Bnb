"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("booking_proposals", "renter_name",
        { type: S.STRING(100), allowNull: true }, { transaction });
      await queryInterface.addColumn("booking_proposals", "renter_phone",
        { type: S.STRING(15), allowNull: true }, { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("booking_proposals", "renter_phone", { transaction });
      await queryInterface.removeColumn("booking_proposals", "renter_name", { transaction });
    });
  },
};
