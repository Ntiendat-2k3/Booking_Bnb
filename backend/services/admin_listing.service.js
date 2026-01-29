const { Listing, User, ListingImage, Amenity, Sequelize } = require("../models");
const { Op } = Sequelize;
const { literal } = Sequelize;

function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

module.exports = {
  isUuid,

  async list({ status } = {}) {
    const where = { deleted_at: null };
    if (status && status !== "all") where.status = status;

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
        [
          literal(`(
            SELECT COUNT(1)
            FROM listing_images li
            WHERE li.listing_id = "Listing".id
          )`),
          "image_count",
        ],
      ],
    };

    const items = await Listing.findAll({
      where,
      attributes: attrs,
      include: [{ model: User, as: "host", attributes: ["id", "full_name", "email"] }],
      order: [["created_at", "DESC"]],
      limit: 300,
    });

    return { items };
  },

  async approve(id) {
    if (!isUuid(id)) {
      const err = new Error("Invalid listing id");
      err.status = 400;
      throw err;
    }
    const listing = await Listing.findByPk(id);
    if (!listing) {
      const err = new Error("Listing not found");
      err.status = 404;
      throw err;
    }
    if (listing.status !== "pending") {
      const err = new Error("Only pending listing can be approved");
      err.status = 400;
      throw err;
    }
    await listing.update({ status: "published", reject_reason: null });
    return { listing };
  },

  async reject(id, reason) {
    if (!isUuid(id)) {
      const err = new Error("Invalid listing id");
      err.status = 400;
      throw err;
    }
    const listing = await Listing.findByPk(id);
    if (!listing) {
      const err = new Error("Listing not found");
      err.status = 404;
      throw err;
    }
    if (listing.status !== "pending") {
      const err = new Error("Only pending listing can be rejected");
      err.status = 400;
      throw err;
    }
    await listing.update({ status: "rejected", reject_reason: reason || "Không đạt yêu cầu" });
    return { listing };
  },
};
