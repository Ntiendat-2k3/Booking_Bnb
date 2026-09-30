"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_payment_methods_provider') THEN
          ALTER TYPE enum_payment_methods_provider ADD VALUE IF NOT EXISTS 'stripe';
          ALTER TYPE enum_payment_methods_provider ADD VALUE IF NOT EXISTS 'bank';
          ALTER TYPE enum_payment_methods_provider ADD VALUE IF NOT EXISTS 'momo';
          ALTER TYPE enum_payment_methods_provider ADD VALUE IF NOT EXISTS 'vnpay';
        END IF;
      END $$;`);
  },
  async down() {
    // PostgreSQL không hỗ trợ xóa enum value trực tiếp; giữ các giá trị để tránh mất dữ liệu đã lưu.
  },
};
