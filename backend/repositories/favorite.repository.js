const Repository = require("../core/repository");
const { Favorite } = require("../models");

module.exports = class FavoriteRepository extends Repository {
  getModel() {
    return Favorite;
  }

  findByUserAndListing(userId, listingId) {
    return this.model.findOne({ where: { user_id: userId, listing_id: listingId } });
  }

  async toggle(userId, listingId) {
    const existed = await this.findByUserAndListing(userId, listingId);
    if (existed) {
      await this.model.destroy({ where: { user_id: userId, listing_id: listingId } });
      return { favorited: false };
    }
    await this.model.create({ user_id: userId, listing_id: listingId, created_at: new Date() });
    return { favorited: true };
  }
};
