"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("payments", "reference_number", {
        type: S.BIGINT,
        allowNull: true,
      }, { transaction });

      await queryInterface.sequelize.query(
        "CREATE SEQUENCE payments_reference_number_seq AS bigint MINVALUE 1 MAXVALUE 2821109907455 START WITH 1",
        { transaction },
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE payments ALTER COLUMN reference_number SET DEFAULT nextval('payments_reference_number_seq')",
        { transaction },
      );
      await queryInterface.sequelize.query(`
        WITH numbered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS value
          FROM payments
        )
        UPDATE payments AS payment
        SET reference_number = numbered.value
        FROM numbered
        WHERE payment.id = numbered.id
      `, { transaction });
      await queryInterface.sequelize.query(`
        SELECT setval(
          'payments_reference_number_seq',
          GREATEST((SELECT COALESCE(MAX(reference_number), 0) FROM payments), 1),
          EXISTS (SELECT 1 FROM payments)
        )
      `, { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE payments ALTER COLUMN reference_number SET NOT NULL",
        { transaction },
      );
      await queryInterface.addIndex("payments", ["reference_number"], {
        name: "payments_reference_number_unique",
        unique: true,
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("payments", "payments_reference_number_unique", { transaction });
      await queryInterface.removeColumn("payments", "reference_number", { transaction });
      await queryInterface.sequelize.query("DROP SEQUENCE payments_reference_number_seq", { transaction });
    });
  },
};
