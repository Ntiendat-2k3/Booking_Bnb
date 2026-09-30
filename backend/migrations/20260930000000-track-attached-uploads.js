"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("uploaded_assets", "attached_at", { type: Sequelize.DATE, allowNull: true }, { transaction });
      await queryInterface.sequelize.query(`
        UPDATE uploaded_assets AS asset
        SET attached_at = image.created_at
        FROM listing_images AS image
        WHERE image.public_id = asset.public_id
      `, { transaction });
      await queryInterface.addIndex("uploaded_assets", ["created_at"], {
        name: "uploaded_assets_unattached_age_idx",
        where: { attached_at: null, delete_requested: false }, transaction,
      });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex("uploaded_assets", "uploaded_assets_unattached_age_idx", { transaction });
      await queryInterface.removeColumn("uploaded_assets", "attached_at", { transaction });
    });
  },
};
