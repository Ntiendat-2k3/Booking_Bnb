const {
  Listing,
  User,
  ListingImage,
  Amenity,
  ListingAmenity,
  Favorite,
  Booking,
  Review,
  UploadedAsset,
  sequelize,
  Sequelize,
} = require("../models");
const { enqueueDeletion } = require("./uploaded_asset.service");

const { isUuid, pick } = require("../utils/validators");
const { isAdminRole } = require("../utils/roles");

function normalizeNumber(v, { int = false, defaultValue } = {}) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return null;
    v = t;
  }
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (int) return Math.trunc(n);
  return n;
}

function sanitizeListingData(raw = {}) {
  const data = { ...raw };

  if ("lat" in data) data.lat = normalizeNumber(data.lat);
  if ("lng" in data) data.lng = normalizeNumber(data.lng);

  if ("price_per_night" in data)
    data.price_per_night = normalizeNumber(data.price_per_night, { int: true });
  if ("max_guests" in data)
    data.max_guests = normalizeNumber(data.max_guests, { int: true });

  if ("bedrooms" in data)
    data.bedrooms =
      normalizeNumber(data.bedrooms, { int: true, defaultValue: 0 }) ?? 0;
  if ("beds" in data)
    data.beds = normalizeNumber(data.beds, { int: true, defaultValue: 0 }) ?? 0;
  if ("bathrooms" in data)
    data.bathrooms = normalizeNumber(data.bathrooms, { defaultValue: 0 }) ?? 0;

  for (const k of ["address", "description", "property_type", "room_type"]) {
    if (k in data && typeof data[k] === "string" && data[k].trim() === "")
      data[k] = null;
  }

  return data;
}

const UPDATABLE_FIELDS = [
  "title",
  "description",
  "address",
  "city",
  "country",
  "lat",
  "lng",
  "property_type",
  "room_type",
  "price_per_night",
  "cancellation_policy_code",
  "allow_pay_at_property",
  "max_guests",
  "bedrooms",
  "beds",
  "bathrooms",
];

module.exports = {
  async listForUser(user, { status } = {}) {
    const where = { deleted_at: null };
    if (!isAdminRole(user.role)) where.host_id = user.id;
    if (status && status !== "all") where.status = status;

    const { literal } = Sequelize;

    const attrs = {
      include: [
        [
          literal(`(
            SELECT li.url
            FROM listing_images li
            WHERE li.listing_id = "Listing".id
            ORDER BY li.is_cover DESC, li.sort_order ASC
            LIMIT 1
          )`),
          "cover_url",
        ],
      ],
    };

    const items = await Listing.findAll({
      where,
      attributes: attrs,
      include: [
        {
          model: User,
          as: "host",
          attributes: ["id", "full_name", "avatar_url"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 200,
    });

    return { items };
  },

  async getByIdForUser(user, id, options = {}) {
    if (!isUuid(id)) {
      const err = new Error("Invalid listing id");
      err.status = 400;
      throw err;
    }

    const listing = await Listing.findOne({
      where: { id, deleted_at: null },
      include: [
        {
          model: User,
          as: "host",
          attributes: ["id", "full_name", "avatar_url"],
        },
        {
          model: ListingImage,
          as: "images",
          attributes: ["id", "url", "sort_order", "is_cover", "public_id"],
          separate: true,
          order: [["sort_order", "ASC"]],
        },
        {
          model: Amenity,
          as: "amenities",
          through: { attributes: [] },
          attributes: ["id", "name", "group"],
        },
      ],
      ...options,
    });

    if (!listing) {
      const err = new Error("Listing not found");
      err.status = 404;
      throw err;
    }

    if (!isAdminRole(user.role) && listing.host_id !== user.id) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }

    return { listing };
  },

  async createDraft(user, body) {

    let data = pick(body || {}, UPDATABLE_FIELDS);
    data = sanitizeListingData(data);

    if (!data.title) {
      const err = new Error("title is required");
      err.status = 400;
      throw err;
    }
    if (!data.city) {
      const err = new Error("city is required");
      err.status = 400;
      throw err;
    }
    if (!data.country) {
      const err = new Error("country is required");
      err.status = 400;
      throw err;
    }
    if (data.price_per_night == null) {
      const err = new Error("price_per_night is required");
      err.status = 400;
      throw err;
    }
    if (data.max_guests == null) {
      const err = new Error("max_guests is required");
      err.status = 400;
      throw err;
    }

    const listing = await Listing.create({
      ...data,
      host_id: user.id,
      status: "draft",
      created_at: new Date(),
    });

    return { listing };
  },

  async update(user, id, body) {
    let data = pick(body || {}, UPDATABLE_FIELDS);
    data = sanitizeListingData(data);
    const listing = await sequelize.transaction(async (transaction) => {
      const { listing: current } = await this.getByIdForUser(user, id, { transaction, lock: transaction.LOCK.UPDATE, include: [] });
      this.assertEditable(user, current);
      await current.update(data, { transaction });
      await this.requireReviewAfterEdit(current, transaction);
      return current;
    });
    return { listing };
  },

  async setAmenities(user, id, amenityIds = []) {
    await sequelize.transaction(async (transaction) => {
      const { listing } = await this.getByIdForUser(user, id, { transaction, lock: transaction.LOCK.UPDATE, include: [] });
      this.assertEditable(user, listing);
      const ids = Array.from(new Set(amenityIds));
      if (await Amenity.count({ where: { id: ids, is_active: true }, transaction }) !== ids.length) {
        throw Object.assign(new Error("Invalid amenities"), { status: 400 });
      }
      await ListingAmenity.destroy({ where: { listing_id: id }, transaction });
      if (ids.length) await ListingAmenity.bulkCreate(ids.map((amenityId) => ({ listing_id: id, amenity_id: amenityId })), { transaction });
      await this.requireReviewAfterEdit(listing, transaction);
    });
    return this.getByIdForUser(user, id);
  },

  async submitForReview(user, id) {
    const { listing } = await this.getByIdForUser(user, id);

    if (!isAdminRole(user.role)) {
      if (!["draft", "rejected"].includes(listing.status)) {
        const err = new Error("Only draft/rejected can be submitted");
        err.status = 400;
        throw err;
      }
    }

    const imgCount = await ListingImage.count({ where: { listing_id: id } });
    if (imgCount < 1) {
      const err = new Error("Bạn cần upload ít nhất 1 ảnh trước khi gửi duyệt");
      err.status = 400;
      throw err;
    }

    const amenityCount = await ListingAmenity.count({
      where: { listing_id: id },
    });
    if (amenityCount < 1) {
      const err = new Error(
        "Bạn cần chọn ít nhất 1 tiện nghi trước khi gửi duyệt",
      );
      err.status = 400;
      throw err;
    }

    await listing.update({ status: "pending", reject_reason: null });
    return { listing };
  },

  async pause(user, id) {
    const { listing } = await this.getByIdForUser(user, id);
    if (listing.status !== "published") {
      const err = new Error("Only published listing can be paused");
      err.status = 400;
      throw err;
    }
    await listing.update({ status: "paused" });
    return { listing };
  },

  async resume(user, id) {
    const { listing } = await this.getByIdForUser(user, id);
    if (listing.status !== "paused") {
      const err = new Error("Only paused listing can be resumed");
      err.status = 400;
      throw err;
    }
    await listing.update({ status: "published" });
    return { listing };
  },

  /** Xóa hẳn phòng chưa phát sinh lịch sử đặt phòng; giữ nguyên dữ liệu giao dịch khi đã có khách đặt. */
  async deleteListing(user, id) {
    return sequelize.transaction(async (t) => {
      const { listing } = await this.getByIdForUser(user, id, { transaction: t, lock: t.LOCK.UPDATE, include: [] });
      const [hasBookings, hasReviews] = await Promise.all([
        Booking.count({ where: { listing_id: id }, transaction: t }),
        Review.count({ where: { listing_id: id }, paranoid: false, transaction: t }),
      ]);
      if (hasBookings || hasReviews) {
        throw Object.assign(new Error("Không thể xóa vĩnh viễn phòng đã có đơn đặt hoặc đánh giá. Hãy tạm dừng phòng để ngừng nhận khách."), { status: 409 });
      }
      const images = await ListingImage.findAll({
        where: { listing_id: id },
        attributes: ["id", "public_id", "resource_type"],
        transaction: t,
      });

      for (const img of images) await enqueueDeletion(img, listing, t);

      await ListingImage.destroy({ where: { listing_id: id }, transaction: t });
      await ListingAmenity.destroy({
        where: { listing_id: id },
        transaction: t,
      });
      await Favorite.destroy({ where: { listing_id: id }, transaction: t });
      await UploadedAsset.update({ listing_id: null }, { where: { listing_id: id }, transaction: t });
      await listing.destroy({ force: true, transaction: t });

      return { ok: true };
    });
  },

  assertEditable(user, listing) {
    if (!isAdminRole(user.role) && !["draft", "rejected", "paused", "published", "pending"].includes(listing.status)) {
      throw Object.assign(new Error("Thông tin đăng tải không thể chỉnh sửa ở trạng thái này"), { status: 400 });
    }
  },

  /** Mọi thay đổi đối với phòng đã từng hiển thị phải được duyệt trước khi công khai lại. */
  async requireReviewAfterEdit(listing, transaction) {
    if (["published", "paused"].includes(listing.status)) {
      await listing.update({ status: "pending", reject_reason: null }, { transaction });
    }
  },
};
