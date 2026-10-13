"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_role') THEN
          ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS 'super_admin';
        END IF;
      END $$;`);
    await queryInterface.sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_one_super_admin
      ON users (role) WHERE role = 'super_admin';`);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query("DROP INDEX IF EXISTS users_one_super_admin;");
    // PostgreSQL không hỗ trợ xóa trực tiếp giá trị enum đã được sử dụng.
  },
};
