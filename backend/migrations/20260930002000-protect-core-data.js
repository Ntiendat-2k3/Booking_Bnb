"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Dữ liệu cũ có thể có nhiều ảnh bìa; giữ ảnh đứng đầu theo thứ tự hiển thị.
      await queryInterface.sequelize.query(`
        WITH ranked AS (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY listing_id ORDER BY sort_order, created_at, id
          ) AS position
          FROM listing_images
          WHERE is_cover = TRUE
        )
        UPDATE listing_images AS image
        SET is_cover = FALSE
        FROM ranked
        WHERE image.id = ranked.id AND ranked.position > 1
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS listing_images_one_cover_per_listing
        ON listing_images (listing_id) WHERE is_cover = TRUE
      `, { transaction });
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_one_default_per_user
        ON payment_methods (user_id) WHERE is_default = TRUE
      `, { transaction });

      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_valid_capacity_price') THEN
            ALTER TABLE listings ADD CONSTRAINT listings_valid_capacity_price
              CHECK (price_per_night > 0 AND max_guests > 0 AND bedrooms >= 0 AND beds >= 0 AND bathrooms >= 0);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_check_range') THEN
            ALTER TABLE bookings ADD CONSTRAINT bookings_check_range CHECK (check_in < check_out);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_positive_amount_and_guests') THEN
            ALTER TABLE bookings ADD CONSTRAINT bookings_positive_amount_and_guests
              CHECK (guests_count > 0 AND price_per_night_snapshot > 0 AND total_amount > 0);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_positive_amount') THEN
            ALTER TABLE payments ADD CONSTRAINT payments_positive_amount CHECK (amount > 0);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_rating_range') THEN
            ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);
          END IF;
        END $$;
      `, { transaction });

      // Chỉ thay FK còn CASCADE; giữ nguyên chính sách đã được siết chặt ở nơi khác.
      await queryInterface.sequelize.query(`
        DO $$
        DECLARE fk RECORD;
        BEGIN
          FOR fk IN
            SELECT spec.table_name, spec.column_name, spec.target_name, constraint_name.conname
            FROM (VALUES
              ('bookings', 'listing_id', 'listings'),
              ('bookings', 'guest_id', 'users'),
              ('payments', 'booking_id', 'bookings'),
              ('reviews', 'booking_id', 'bookings'),
              ('reviews', 'listing_id', 'listings'),
              ('reviews', 'reviewer_id', 'users')
            ) AS spec(table_name, column_name, target_name)
            JOIN pg_constraint AS constraint_name
              ON constraint_name.conrelid = spec.table_name::regclass
             AND constraint_name.contype = 'f'
             AND constraint_name.confdeltype = 'c'
            JOIN pg_attribute AS attribute_name
              ON attribute_name.attrelid = constraint_name.conrelid
             AND attribute_name.attnum = ANY(constraint_name.conkey)
             AND attribute_name.attname = spec.column_name
          LOOP
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', fk.table_name, fk.conname);
            EXECUTE format(
              'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(id) ON UPDATE CASCADE ON DELETE RESTRICT',
              fk.table_name, fk.conname, fk.column_name, fk.target_name
            );
          END LOOP;
        END $$;
      `, { transaction });
    });
  },

  async down() {
    throw new Error("Không tự động hoàn tác vì không thể phục hồi cờ ảnh bìa cũ hoặc bật lại xóa dây chuyền an toàn.");
  },
};
