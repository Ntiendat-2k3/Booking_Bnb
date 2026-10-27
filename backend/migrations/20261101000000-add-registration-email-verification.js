"use strict";

module.exports = {
  async up(queryInterface, S) {
    const [[column]] = await queryInterface.sequelize.query(
      "SELECT udt_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status'",
    );
    const statusType = queryInterface.quoteIdentifier(column.udt_name);
    await queryInterface.sequelize.query(`ALTER TYPE ${statusType} ADD VALUE IF NOT EXISTS 'pending_verification'`);
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("users", "registration_code_hash", { type: S.STRING(64), allowNull: true }, { transaction });
      await queryInterface.addColumn("users", "registration_code_expires", { type: S.DATE, allowNull: true }, { transaction });
      await queryInterface.addColumn("users", "registration_code_sent_at", { type: S.DATE, allowNull: true }, { transaction });
      await queryInterface.addColumn("users", "registration_code_attempts", { type: S.INTEGER, allowNull: false, defaultValue: 0 }, { transaction });
    });
  },

  async down(queryInterface) {
    const [[column]] = await queryInterface.sequelize.query(
      "SELECT udt_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status'",
    );
    const statusType = queryInterface.quoteIdentifier(column.udt_name);
    const previousType = queryInterface.quoteIdentifier(`${column.udt_name}_previous`);
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("users", "registration_code_attempts", { transaction });
      await queryInterface.removeColumn("users", "registration_code_sent_at", { transaction });
      await queryInterface.removeColumn("users", "registration_code_expires", { transaction });
      await queryInterface.removeColumn("users", "registration_code_hash", { transaction });
      await queryInterface.sequelize.query("UPDATE users SET status = 'blocked' WHERE status = 'pending_verification'", { transaction });
      await queryInterface.sequelize.query("ALTER TABLE users ALTER COLUMN status DROP DEFAULT", { transaction });
      await queryInterface.sequelize.query(`CREATE TYPE ${previousType} AS ENUM ('active', 'blocked')`, { transaction });
      await queryInterface.sequelize.query(`ALTER TABLE users ALTER COLUMN status TYPE ${previousType} USING status::text::${previousType}`, { transaction });
      await queryInterface.sequelize.query(`DROP TYPE ${statusType}`, { transaction });
      await queryInterface.sequelize.query(`ALTER TYPE ${previousType} RENAME TO ${statusType}`, { transaction });
      await queryInterface.sequelize.query("ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active'", { transaction });
    });
  },
};
