"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auth_provider') THEN
          ALTER TYPE auth_provider ADD VALUE IF NOT EXISTS 'apple';
          ALTER TYPE auth_provider ADD VALUE IF NOT EXISTS 'facebook';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_provider') THEN
          ALTER TYPE enum_users_provider ADD VALUE IF NOT EXISTS 'apple';
          ALTER TYPE enum_users_provider ADD VALUE IF NOT EXISTS 'facebook';
        END IF;
      END $$;`);
  },
  async down() {
    // PostgreSQL không hỗ trợ xóa trực tiếp một giá trị enum đã có dữ liệu.
  },
};
