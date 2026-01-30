const { Listing, Sequelize, User, Amenity, ListingAmenity, ListingImage } = require("../models");
const ListingRepository = require("../repositories/listing.repository");

const listingRepo = new ListingRepository();
const { literal } = Sequelize;

function hasCoords(filters = {}) {
  // IMPORTANT: Number(null) === 0 (finite) => must guard explicitly.
  const lat = filters.lat;
  const lng = filters.lng;
  if (lat === null || lat === undefined || lat === "") return false;
  if (lng === null || lng === undefined || lng === "") return false;
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
}

function parseSort(sort) {
  switch (sort) {
    case "distance_asc":
      // "distance_km" is only included when lat/lng is present
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

    // Prevent ordering by distance when client hasn't provided lat/lng
    const hasCoordsFlag = hasCoords(filters);
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

    // Nearby search: return distance_km for UI ("Cách bạn X km")
    const lat = Number(filters.lat);
    const lng = Number(filters.lng);
    if (hasCoordsFlag) {
      attrs.include.push([
        literal(`(
          6371 * acos(
            cos(radians(${lat})) * cos(radians(CAST("Listing"."lat" AS double precision)))
            * cos(radians(CAST("Listing"."lng" AS double precision)) - radians(${lng}))
            + sin(radians(${lat})) * sin(radians(CAST("Listing"."lat" AS double precision)))
          )
        )`),
        "distance_km",
      ]);

      // If client didn't set sort, default to distance for near-me results
      if (!filters.sort) filters.sort = "distance_asc";
    }

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
      attributes: {
        include: [
          [
            literal(`(
              SELECT COALESCE(AVG(r.rating), 0)
              FROM reviews r
              LEFT JOIN user_settings us ON us.user_id = r.reviewer_id
              WHERE r.listing_id = "Listing".id
                AND COALESCE(us.show_reviews, TRUE) = TRUE
            )`),
            "avg_rating",
          ],
          [
            literal(`(
              SELECT COUNT(1)
              FROM reviews r
              LEFT JOIN user_settings us ON us.user_id = r.reviewer_id
              WHERE r.listing_id = "Listing".id
                AND COALESCE(us.show_reviews, TRUE) = TRUE
            )`),
            "review_count",
          ],
        ],
      },
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

    // Reviews (Sprint 5): respect privacy settings
    const reviewService = require("./review.service");
    const reviewData = await reviewService.listPublicByListing({ listingId: id, page: 1, limit: 10 });

    return { listing, reviews: reviewData.items };
  },
};
