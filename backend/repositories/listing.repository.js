const Repository = require("../core/repository");
const { Listing, Sequelize } = require("../models");
const { Op } = Sequelize;

module.exports = class ListingRepository extends Repository {
  getModel() {
    return Listing;
  }

  buildWhere(filters = {}) {
    const where = { deleted_at: null, status: "published" };

    if (filters.city) where.city = { [Op.iLike]: `%${filters.city}%` };
    if (filters.country) where.country = { [Op.iLike]: `%${filters.country}%` };

    if (filters.min_price != null) where.price_per_night = { ...(where.price_per_night || {}), [Op.gte]: filters.min_price };
    if (filters.max_price != null) where.price_per_night = { ...(where.price_per_night || {}), [Op.lte]: filters.max_price };

    if (filters.guests != null) where.max_guests = { [Op.gte]: filters.guests };
    if (filters.bedrooms != null) where.bedrooms = { [Op.gte]: filters.bedrooms };

    if (filters.room_type) where.room_type = { [Op.eq]: filters.room_type };
    if (filters.property_type) where.property_type = { [Op.eq]: filters.property_type };

    return where;
  }
};
