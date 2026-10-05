"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const S = Sequelize;
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Bảng đã có được giữ nguyên để migration nền chạy an toàn trên database cũ.
      async function createMissing(name, columns, indexes = []) {
        if (await queryInterface.tableExists(name, { transaction })) return;
        await queryInterface.createTable(name, columns, { transaction });
        for (const [fields, options] of indexes) {
          await queryInterface.addIndex(name, fields, { ...options, transaction });
        }
      }

      const id = () => ({ type: S.UUID, defaultValue: S.UUIDV4, primaryKey: true });
      const createdAt = () => ({ type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") });
      const updatedAt = () => ({ type: S.DATE, allowNull: false, defaultValue: S.fn("NOW") });
      const reference = (table, nullable = false, onDelete = "CASCADE") => ({
        type: S.UUID,
        allowNull: nullable,
        references: { model: table, key: "id" },
        onUpdate: "CASCADE",
        onDelete,
      });

      await createMissing("users", {
        id: id(),
        email: { type: S.STRING(255), allowNull: false, unique: true },
        password_hash: { type: S.TEXT },
        full_name: { type: S.STRING(255), allowNull: false },
        phone: { type: S.STRING(30) },
        avatar_url: { type: S.TEXT },
        about: { type: S.TEXT },
        location: { type: S.STRING(255) },
        role: { type: S.ENUM("guest", "host", "admin"), allowNull: false, defaultValue: "guest" },
        status: { type: S.ENUM("active", "blocked"), allowNull: false, defaultValue: "active" },
        provider: { type: S.ENUM("local", "google"), allowNull: false, defaultValue: "local" },
        provider_id: { type: S.STRING(255) },
        created_at: createdAt(),
        updated_at: updatedAt(),
      });

      await createMissing("amenities", {
        id: id(),
        name: { type: S.STRING(120), allowNull: false },
        slug: { type: S.STRING(120), allowNull: false, unique: true },
        group: { type: S.STRING(120) },
        is_active: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: createdAt(),
        updated_at: updatedAt(),
      });

      await createMissing("listings", {
        id: id(),
        host_id: reference("users"),
        title: { type: S.STRING(255), allowNull: false },
        description: { type: S.TEXT },
        address: { type: S.STRING(255) },
        city: { type: S.STRING(120), allowNull: false },
        country: { type: S.STRING(120), allowNull: false },
        lat: { type: S.DECIMAL(10, 7) },
        lng: { type: S.DECIMAL(10, 7) },
        property_type: { type: S.STRING(80) },
        room_type: { type: S.STRING(80) },
        price_per_night: { type: S.BIGINT, allowNull: false },
        max_guests: { type: S.INTEGER, allowNull: false },
        bedrooms: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
        beds: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
        bathrooms: { type: S.DECIMAL(3, 1), allowNull: false, defaultValue: 0 },
        status: { type: S.ENUM("draft", "pending", "published", "paused", "rejected"), allowNull: false, defaultValue: "draft" },
        reject_reason: { type: S.TEXT },
        deleted_at: { type: S.DATE },
        created_at: createdAt(),
        updated_at: updatedAt(),
      }, [[["host_id"], {}]]);

      await createMissing("listing_images", {
        id: id(),
        listing_id: reference("listings"),
        url: { type: S.TEXT, allowNull: false },
        public_id: { type: S.TEXT },
        width: { type: S.INTEGER },
        height: { type: S.INTEGER },
        bytes: { type: S.INTEGER },
        format: { type: S.STRING(20) },
        resource_type: { type: S.STRING(20), allowNull: false, defaultValue: "image" },
        sort_order: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
        is_cover: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: createdAt(),
      }, [[["listing_id"], {}]]);

      await createMissing("listing_amenities", {
        listing_id: { ...reference("listings"), primaryKey: true },
        amenity_id: { ...reference("amenities"), primaryKey: true },
        created_at: createdAt(),
      }, [[["amenity_id"], {}]]);

      await createMissing("favorites", {
        user_id: { ...reference("users"), primaryKey: true },
        listing_id: { ...reference("listings"), primaryKey: true },
        created_at: createdAt(),
      }, [[["listing_id"], {}]]);

      await createMissing("refresh_tokens", {
        id: id(),
        user_id: reference("users"),
        token_hash: { type: S.TEXT, allowNull: false, unique: true },
        expires_at: { type: S.DATE, allowNull: false },
        revoked_at: { type: S.DATE },
        created_ip: { type: S.STRING(64) },
        user_agent: { type: S.TEXT },
        created_at: createdAt(),
      }, [[["user_id"], {}]]);

      await createMissing("bookings", {
        id: id(),
        listing_id: reference("listings", false, "RESTRICT"),
        guest_id: reference("users", false, "RESTRICT"),
        check_in: { type: S.DATEONLY, allowNull: false },
        check_out: { type: S.DATEONLY, allowNull: false },
        guests_count: { type: S.INTEGER, allowNull: false },
        status: { type: S.ENUM("pending_payment", "confirmed", "cancelled", "completed"), allowNull: false, defaultValue: "pending_payment" },
        price_per_night_snapshot: { type: S.BIGINT, allowNull: false },
        total_amount: { type: S.BIGINT, allowNull: false },
        currency: { type: S.STRING(3), allowNull: false, defaultValue: "VND" },
        created_at: createdAt(),
        updated_at: updatedAt(),
      }, [[["listing_id", "check_in", "check_out"], { name: "idx_bookings_listing_dates" }], [["guest_id"], { name: "idx_bookings_guest" }]]);

      await createMissing("payments", {
        id: id(),
        booking_id: reference("bookings", false, "RESTRICT"),
        provider: { type: S.ENUM("vnpay", "stripe"), allowNull: false },
        status: { type: S.ENUM("pending", "succeeded", "failed", "cancelled", "refunded"), allowNull: false, defaultValue: "pending" },
        amount: { type: S.BIGINT, allowNull: false },
        currency: { type: S.STRING(3), allowNull: false, defaultValue: "VND" },
        provider_txn_ref: { type: S.STRING(255) },
        provider_transaction_no: { type: S.STRING(255) },
        paid_at: { type: S.DATE },
        payload: { type: S.JSONB },
        created_at: createdAt(),
        updated_at: updatedAt(),
      }, [[["booking_id"], { name: "idx_payments_booking" }], [["provider", "provider_txn_ref"], { name: "idx_payments_provider_ref" }]]);

      await createMissing("user_settings", {
        user_id: { ...reference("users"), primaryKey: true },
        show_profile: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
        show_reviews: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
        marketing_emails: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
        updated_at: updatedAt(),
      });

      await createMissing("payment_methods", {
        id: id(),
        user_id: reference("users"),
        provider: { type: S.ENUM("vnpay", "stripe", "momo", "bank"), allowNull: false },
        type: { type: S.ENUM("card", "ewallet", "bank_transfer"), allowNull: false },
        label: { type: S.STRING(255), allowNull: false },
        is_default: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
        meta: { type: S.JSONB },
        created_at: createdAt(),
        updated_at: updatedAt(),
      }, [[["user_id"], { name: "idx_payment_methods_user" }]]);

      await createMissing("reviews", {
        id: id(),
        booking_id: { ...reference("bookings", false, "RESTRICT"), unique: true },
        listing_id: reference("listings", false, "RESTRICT"),
        reviewer_id: reference("users", false, "RESTRICT"),
        rating: { type: S.INTEGER, allowNull: false },
        comment: { type: S.TEXT },
        is_hidden: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: createdAt(),
        updated_at: { type: S.DATE },
      }, [[["listing_id"], { name: "idx_reviews_listing" }], [["reviewer_id"], { name: "idx_reviews_reviewer" }], [["is_hidden"], { name: "idx_reviews_hidden" }]]);
    });
  },

  async down() {
    throw new Error("Không tự động xóa schema nền vì có thể chứa dữ liệu đã tồn tại trước migration.");
  },
};
