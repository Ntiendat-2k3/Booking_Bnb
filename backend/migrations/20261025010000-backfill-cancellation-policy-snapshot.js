"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        UPDATE bookings SET cancellation_policy_snapshot =
          '{"code":"moderate","version":1,"windows":[{"days_before":5,"refund_percent":100},{"days_before":1,"refund_percent":50}],"grace_hours":48}'::jsonb
        WHERE cancellation_policy_snapshot IS NULL
      `, { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE bookings ALTER COLUMN cancellation_policy_snapshot SET NOT NULL", { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE bookings ALTER COLUMN cancellation_policy_snapshot DROP NOT NULL");
  },
};
