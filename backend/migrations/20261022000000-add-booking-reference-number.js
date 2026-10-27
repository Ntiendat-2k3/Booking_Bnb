"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("bookings", "reference_number", {
        type: S.BIGINT,
        allowNull: true,
      }, { transaction });

      await queryInterface.sequelize.query(
        "CREATE SEQUENCE bookings_reference_number_seq AS bigint MINVALUE 1 MAXVALUE 2821109907455 START WITH 1",
        { transaction },
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE bookings ALTER COLUMN reference_number SET DEFAULT nextval('bookings_reference_number_seq')",
        { transaction },
      );
      await queryInterface.sequelize.query(`
        WITH numbered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS value
          FROM bookings
        )
        UPDATE bookings AS booking
        SET reference_number = numbered.value
        FROM numbered
        WHERE booking.id = numbered.id
      `, { transaction });
      await queryInterface.sequelize.query(`
        SELECT setval(
          'bookings_reference_number_seq',
          GREATEST((SELECT COALESCE(MAX(reference_number), 0) FROM bookings), 1),
          EXISTS (SELECT 1 FROM bookings)
        )
      `, { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE bookings ALTER COLUMN reference_number SET NOT NULL",
        { transaction },
      );
      await queryInterface.addIndex("bookings", ["reference_number"], {
        name: "bookings_reference_number_unique",
        unique: true,
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("bookings", "bookings_reference_number_unique", { transaction });
      await queryInterface.removeColumn("bookings", "reference_number", { transaction });
      await queryInterface.sequelize.query("DROP SEQUENCE bookings_reference_number_seq", { transaction });
    });
  },
};
