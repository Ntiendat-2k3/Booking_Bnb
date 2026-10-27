"use strict";

module.exports = {
  async up(queryInterface) {
    // Một số cơ sở dữ liệu cũ dùng payment_provider thay cho enum_payments_provider.
    // Lấy kiểu thực của cột để migration hoạt động trên cả hai schema.
    const [rows] = await queryInterface.sequelize.query(`
      SELECT provider_type.typname AS name
      FROM pg_attribute AS column_info
      JOIN pg_class AS payments ON payments.oid = column_info.attrelid
      JOIN pg_namespace AS table_schema ON table_schema.oid = payments.relnamespace
      JOIN pg_type AS provider_type ON provider_type.oid = column_info.atttypid
      WHERE table_schema.nspname = current_schema()
        AND payments.relname = 'payments'
        AND column_info.attname = 'provider'
        AND column_info.attnum > 0
        AND NOT column_info.attisdropped
        AND provider_type.typtype = 'e'
    `);
    if (rows.length !== 1) throw new Error("payments.provider must use a PostgreSQL enum");
    const enumName = queryInterface.quoteIdentifier(rows[0].name);
    // Giá trị enum phải được commit trước khi tạo payment trong transaction khác.
    await queryInterface.sequelize.query(`ALTER TYPE ${enumName} ADD VALUE IF NOT EXISTS 'property'`);
  },

  async down() {
    // PostgreSQL không hỗ trợ xóa riêng một giá trị enum đã có dữ liệu tham chiếu.
  },
};
