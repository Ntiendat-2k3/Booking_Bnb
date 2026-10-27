"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.addColumn("listings", "show_public_calendar", {
      type: S.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("listings", "show_public_calendar");
  },
};
