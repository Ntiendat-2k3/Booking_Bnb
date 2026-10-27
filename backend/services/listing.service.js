const { Listing, Sequelize, User, Amenity, ListingImage } = require("../models");
const ListingRepository = require("../repositories/listing.repository");
const pricing = require("./pricing.service");

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

    const dated = Boolean(filters.check_in);
    if (dated) pricing.assertDates(filters.check_in, filters.check_out);
    const where = listingRepo.buildWhere(dated ? { ...filters, min_price: null, max_price: null } : filters);

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

    const query = {
      where,
      attributes: attrs,
      include: [
        { model: User, as: "host", attributes: ["id", "full_name", "avatar_url", "about", "location"] },
      ],
      order,
    };
    if (dated) {
      const candidates = await Listing.findAll(query);
      const data = await pricing.loadForListings(candidates.map((item) => item.id),
        filters.check_in, filters.check_out);
      const priced = [];
      for (const item of candidates) {
        let quote;
        try {
          quote = pricing.quoteFromData(item, filters.check_in, filters.check_out,
            data.rules.get(String(item.id)) || [], data.dailyPrices.get(String(item.id)) || []);
        } catch (error) {
          if (error.status === 409) continue;
          throw error;
        }
        const total = BigInt(quote.total);
        const nights = BigInt(quote.nights.length);
        if (filters.min_price != null && total < BigInt(filters.min_price) * nights) continue;
        if (filters.max_price != null && total > BigInt(filters.max_price) * nights) continue;
        priced.push({ ...item.toJSON(), stay_price_total: quote.total,
          stay_nights: quote.nights.length });
      }
      if (filters.sort === "price_asc" || filters.sort === "price_desc")
        priced.sort((a, b) => {
          const difference = BigInt(a.stay_price_total) - BigInt(b.stay_price_total);
          return (difference < 0n ? -1 : difference > 0n ? 1 : 0) *
            (filters.sort === "price_asc" ? 1 : -1);
        });
      return { items: priced.slice(offset, offset + limit), meta: { page, limit,
        total: priced.length, total_pages: Math.ceil(priced.length / limit) } };
    }
    const { rows, count } = await Listing.findAndCountAll({ ...query, limit, offset });

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
