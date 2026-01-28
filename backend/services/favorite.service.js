const { Listing, Sequelize, User } = require("../models");
const FavoriteRepository = require("../repositories/favorite.repository");

const favoriteRepo = new FavoriteRepository();
const { literal } = Sequelize;

module.exports = {
  async list(userId) {
    // return listings favorited by user
    const items = await Listing.findAll({
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
      },
      where: { deleted_at: null, status: "published" },
      order: [[literal('"avg_rating"'), "DESC"], ["created_at", "DESC"]],
    });

    return items;
  },

  async toggle(userId, listingId) {
    return favoriteRepo.toggle(userId, listingId);
  },
};
