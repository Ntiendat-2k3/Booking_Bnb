const { Listing, Sequelize, User, Amenity, ListingAmenity, ListingImage } = require("../models");
const ListingRepository = require("../repositories/listing.repository");

const listingRepo = new ListingRepository();
const { literal } = Sequelize;

function parseSort(sort) {
  switch (sort) {
    case "price_asc":
      return [["price_per_night", "ASC"]];
    case "price_desc":
      return [["price_per_night", "DESC"]];
    case "newest":
      return [["created_at", "DESC"]];
    case "rating_desc":
      return [[literal('"avg_rating"'), "DESC"], [literal('"review_count"'), "DESC"]];
    default:
      return [["created_at", "DESC"]];
  }
}

module.exports = {
  async list(filters) {
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Math.min(50, Math.max(1, Number(filters.limit || 20)));
    const offset = (page - 1) * limit;

    const where = listingRepo.buildWhere(filters);

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
            SELECT COALESCE(AVG(r.rating), 0)
            FROM reviews r
            WHERE r.listing_id = "Listing".id
          )`),
          "avg_rating",
        ],
        [
          literal(`(
            SELECT COUNT(1)
            FROM reviews r
            WHERE r.listing_id = "Listing".id
          )`),
          "review_count",
        ],
      ],
    };

    const order = parseSort(filters.sort);

    const { rows, count } = await Listing.findAndCountAll({
      where,
      attributes: attrs,
      include: [
        { model: User, as: "host", attributes: ["id", "full_name", "avatar_url"] },
      ],
      order,
      limit,
      offset,
    });

    return {
      items: rows,
      meta: {
        page,
        limit,
        total: count,
        total_pages: Math.ceil(count / limit),
      },
    };
  },

  async detail(id) {
    const listing = await Listing.findOne({
      where: { id, deleted_at: null, status: "published" },
      include: [
        { model: User, as: "host", attributes: ["id", "full_name", "avatar_url"] },
        { model: ListingImage, as: "images", attributes: ["id", "url", "sort_order", "is_cover"], separate: true, order: [["sort_order", "ASC"]] },
        { model: Amenity, as: "amenities", through: { attributes: [] }, attributes: ["id", "name", "group"] },
      ],
    });

    if (!listing) {
      const err = new Error("Listing not found");
      err.status = 404;
      throw err;
    }

    // Reviews: simple (top 10 newest)
    const { Review } = require("../models");
    const reviews = await Review.findAll({
      where: { listing_id: id },
      include: [{ model: User, as: "reviewer", attributes: ["id", "full_name", "avatar_url"] }],
      order: [["created_at", "DESC"]],
      limit: 10,
    });

    return { listing, reviews };
  },
};
