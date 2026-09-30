const { Listing, Sequelize, User } = require("../models");
const ListingRepository = require("../repositories/listing.repository");
const listingRepo = new ListingRepository();
const FavoriteRepository = require("../repositories/favorite.repository");

const favoriteRepo = new FavoriteRepository();
const { literal } = Sequelize;

module.exports = {
  async list(userId, { page, limit } = {}) {
    const paginated = page !== undefined || limit !== undefined;
    page ??= 1;
    limit ??= 50;

    const { rows: items, count } = await Listing.findAndCountAll({
      include: [
        {
          model: User,
          as: "favoritedByUsers",
          where: { id: userId },
          attributes: [],
          through: { attributes: [] },
          required: true,
        },
        { model: User, as: "host", attributes: ["id", "full_name", "avatar_url"] },
      ],
      attributes: {
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
      },
      where: { deleted_at: null, status: "published" },
      order: [[literal('"avg_rating"'), "DESC"], ["created_at", "DESC"]],
      distinct: true,
      ...(paginated ? { limit, offset: (page - 1) * limit } : {}),
    });

    return { items, meta: { page, limit: paginated ? limit : count, total: count, total_pages: paginated ? Math.ceil(count / limit) : 1 } };
  },

  async toggle(userId, listingId) {
    return favoriteRepo.toggle(userId, listingId);
  },
};
