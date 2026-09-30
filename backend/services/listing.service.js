const { Listing, Sequelize, User, Amenity, ListingImage } = require("../models");
const ListingRepository = require("../repositories/listing.repository");

const listingRepo = new ListingRepository();
const { literal } = Sequelize;

function parseSort(sort) {
  switch (sort) {
    case "distance_asc":

      return [[literal('"distance_km"'), "ASC"], ["created_at", "DESC"]];
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

    const hasCoordsFlag = listingRepo.hasCoords(filters);
    if (filters.sort === "distance_asc" && !hasCoordsFlag) {
      filters.sort = "newest";
    }

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
        ...listingRepo.publicReviewAttributes(),
      ],
    };

    // Trả khoảng cách để giao diện hiển thị kết quả gần người dùng.
    const lat = Number(filters.lat);
    const lng = Number(filters.lng);
    if (hasCoordsFlag) {
      attrs.include.push([
        literal(`(${listingRepo.distanceSql(lat, lng)})`),
        "distance_km",
      ]);

      if (!filters.sort) filters.sort = "distance_asc";
    }

    const order = parseSort(filters.sort);

    const { rows, count } = await Listing.findAndCountAll({
      where,
      attributes: attrs,
      include: [
        { model: User, as: "host", attributes: ["id", "full_name", "avatar_url", "about", "location"] },
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
      attributes: {
        include: [
          ...listingRepo.publicReviewAttributes(),
        ],
      },
      include: [
        { model: User, as: "host", attributes: ["id", "full_name", "avatar_url", "about", "location"] },
        { model: ListingImage, as: "images", attributes: ["id", "url", "sort_order", "is_cover"], separate: true, order: [["sort_order", "ASC"]] },
        { model: Amenity, as: "amenities", through: { attributes: [] }, attributes: ["id", "name", "group"] },
      ],
    });

    if (!listing) {
      const err = new Error("Listing not found");
      err.status = 404;
      throw err;
    }

    const reviewService = require("./review.service");
    const reviewData = await reviewService.listPublicByListing({ listingId: id, page: 1, limit: 10 });

    return { listing, reviews: reviewData.items };
  },
};
