const { Listing, User, ListingImage, Amenity, ListingAmenity, sequelize, Sequelize } = require("../models");
const { destroy } = require("./cloudinary.service");
const { Op } = Sequelize;

function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function pick(body, keys) {
  const out = {};
  for (const k of keys) if (body[k] !== undefined) out[k] = body[k];
  return out;
}

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

  // Optional decimals
  if ("lat" in data) data.lat = normalizeNumber(data.lat);
  if ("lng" in data) data.lng = normalizeNumber(data.lng);

  // Required numbers (keep null to trigger required validation)
  if ("price_per_night" in data) data.price_per_night = normalizeNumber(data.price_per_night, { int: true });
  if ("max_guests" in data) data.max_guests = normalizeNumber(data.max_guests, { int: true });

  // Defaults (avoid "" -> numeric error)
  if ("bedrooms" in data) data.bedrooms = normalizeNumber(data.bedrooms, { int: true, defaultValue: 0 }) ?? 0;
  if ("beds" in data) data.beds = normalizeNumber(data.beds, { int: true, defaultValue: 0 }) ?? 0;
  if ("bathrooms" in data) data.bathrooms = normalizeNumber(data.bathrooms, { defaultValue: 0 }) ?? 0;

  // Strings: normalize empty string to null for optional fields
  for (const k of ["address", "description", "property_type", "room_type"]) {
    if (k in data && typeof data[k] === "string" && data[k].trim() === "") data[k] = null;
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
  "max_guests",
  "bedrooms",
  "beds",
  "bathrooms",
];

module.exports = {
  isUuid,

  async listForUser(user, { status } = {}) {
    const where = { deleted_at: null };
    if (user.role !== "admin") where.host_id = user.id;
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
      include: [{ model: User, as: "host", attributes: ["id", "full_name", "avatar_url"] }],
      order: [["created_at", "DESC"]],
      limit: 200,
    });

    return { items };
  },

  async getByIdForUser(user, id) {
    if (!isUuid(id)) {
      const err = new Error("Invalid listing id");
      err.status = 400;
      throw err;
    }

    const listing = await Listing.findOne({
      where: { id, deleted_at: null },
      include: [
        { model: User, as: "host", attributes: ["id", "full_name", "avatar_url"] },
        { model: ListingImage, as: "images", attributes: ["id", "url", "sort_order", "is_cover", "public_id"], separate: true, order: [["sort_order", "ASC"]] },
        { model: Amenity, as: "amenities", through: { attributes: [] }, attributes: ["id", "name", "group"] },
      ],
    });

    if (!listing) {
      const err = new Error("Listing not found");
      err.status = 404;
      throw err;
    }

    if (user.role !== "admin" && listing.host_id !== user.id) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }

    return { listing };
  },

  async createDraft(user, body) {
    // Only host/admin
    let data = pick(body || {}, UPDATABLE_FIELDS);
    data = sanitizeListingData(data);

    // basic required (model will enforce too)
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
    const { listing } = await this.getByIdForUser(user, id);

    // Host can edit draft/rejected/paused; admin can edit any
    if (user.role !== "admin") {
      const allowed = new Set(["draft", "rejected", "paused"]);
      if (!allowed.has(listing.status)) {
        const err = new Error("Listing is not editable in this status");
        err.status = 400;
        throw err;
      }
    }

    let data = pick(body || {}, UPDATABLE_FIELDS);
    data = sanitizeListingData(data);
    await listing.update(data);
    return { listing };
  },

  async setAmenities(user, id, amenityIds = []) {
    const { listing } = await this.getByIdForUser(user, id);

    if (user.role !== "admin") {
      const allowed = new Set(["draft", "rejected", "paused"]);
      if (!allowed.has(listing.status)) {
        const err = new Error("Listing is not editable in this status");
        err.status = 400;
        throw err;
      }
    }

    const ids = Array.from(new Set((amenityIds || []).filter(isUuid)));

    // replace
    await ListingAmenity.destroy({ where: { listing_id: id } });
    if (ids.length) {
      const rows = ids.map((aid) => ({ listing_id: id, amenity_id: aid }));
      await ListingAmenity.bulkCreate(rows);
    }

    return this.getByIdForUser(user, id);
  },

  async submitForReview(user, id) {
    const { listing } = await this.getByIdForUser(user, id);

    if (user.role !== "admin") {
      if (!["draft", "rejected"].includes(listing.status)) {
        const err = new Error("Only draft/rejected can be submitted");
        err.status = 400;
        throw err;
      }
    }

    // minimal validation: need at least 1 image
    const imgCount = await ListingImage.count({ where: { listing_id: id } });
    if (imgCount < 1) {
      const err = new Error("Bạn cần upload ít nhất 1 ảnh trước khi gửi duyệt");
      err.status = 400;
      throw err;
    }

    const amenityCount = await ListingAmenity.count({ where: { listing_id: id } });
    if (amenityCount < 1) {
      const err = new Error("Bạn cần chọn ít nhất 1 tiện nghi trước khi gửi duyệt");
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


async deleteListing(user, id) {
  const { listing } = await this.getByIdForUser(user, id);

  // Host can delete draft/rejected/paused/pending; admin can delete any
  if (user.role !== "admin") {
    const allowed = new Set(["draft", "rejected", "paused", "pending"]);
    if (!allowed.has(listing.status)) {
      const err = new Error("Listing cannot be deleted in this status");
      err.status = 400;
      throw err;
    }
  }

  return sequelize.transaction(async (t) => {
    // Load images to delete on Cloudinary
    const images = await ListingImage.findAll({
      where: { listing_id: id },
      attributes: ["id", "public_id"],
      transaction: t,
    });

    // Delete Cloudinary assets (best-effort)
    for (const img of images) {
      if (img.public_id) {
        try {
          await destroy(img.public_id);
        } catch {
          // ignore cloudinary errors
        }
      }
    }

    await ListingImage.destroy({ where: { listing_id: id }, transaction: t });
    await ListingAmenity.destroy({ where: { listing_id: id }, transaction: t });

    await listing.update({ deleted_at: new Date() }, { transaction: t });

    return { ok: true };
  });
},

};