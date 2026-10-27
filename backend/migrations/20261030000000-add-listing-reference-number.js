"use strict";

module.exports = {
  async up(queryInterface, S) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("listings", "reference_number", {
        type: S.BIGINT,
        allowNull: true,
      }, { transaction });

      await queryInterface.sequelize.query(
        "CREATE SEQUENCE listings_reference_number_seq AS bigint MINVALUE 1 MAXVALUE 2821109907455 START WITH 1",
        { transaction },
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE listings ALTER COLUMN reference_number SET DEFAULT nextval('listings_reference_number_seq')",
        { transaction },
      );
      await queryInterface.sequelize.query(`
        WITH numbered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS value
          FROM listings
        )
        UPDATE listings AS listing
        SET reference_number = numbered.value
        FROM numbered
        WHERE listing.id = numbered.id
      `, { transaction });
      await queryInterface.sequelize.query(`
        SELECT setval(
          'listings_reference_number_seq',
          GREATEST((SELECT COALESCE(MAX(reference_number), 0) FROM listings), 1),
          EXISTS (SELECT 1 FROM listings)
        )
      `, { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE listings ALTER COLUMN reference_number SET NOT NULL",
        { transaction },
      );
      await queryInterface.addIndex("listings", ["reference_number"], {
        name: "listings_reference_number_unique",
        unique: true,
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("listings", "listings_reference_number_unique", { transaction });
      await queryInterface.removeColumn("listings", "reference_number", { transaction });
      await queryInterface.sequelize.query("DROP SEQUENCE listings_reference_number_seq", { transaction });
    });
  },
};
