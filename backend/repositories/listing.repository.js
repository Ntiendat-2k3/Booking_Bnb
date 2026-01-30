const Repository = require("../core/repository");
const { Listing, Sequelize } = require("../models");
const { Op } = Sequelize;

// Basic accent-insensitive search for Vietnamese without requiring Postgres extensions.
// We normalize the user's input in JS, and normalize DB fields with TRANSLATE(LOWER(...)).
// This makes search work for both "Ho Chi Minh" and "Hồ Chí Minh".
const VN_FROM = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
const VN_TO   = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";

function normalizeText(v) {
  if (!v) return "";
  return String(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Distance (km) using the spherical law of cosines (works on Postgres without PostGIS)
function distanceSql(lat, lng) {
  // lat/lng are already validated numbers in controller
  // Cast DECIMAL columns to double precision to avoid Postgres type issues
  const latCol = 'CAST("Listing"."lat" AS double precision)';
  const lngCol = 'CAST("Listing"."lng" AS double precision)';
  return `6371 * acos(
    cos(radians(${lat})) * cos(radians(${latCol})) * cos(radians(${lngCol}) - radians(${lng}))
    + sin(radians(${lat})) * sin(radians(${latCol}))
  )`;
}

module.exports = class ListingRepository extends Repository {
  getModel() {
    return Listing;
  }

  hasCoords(filters = {}) {
    // IMPORTANT: Number(null) === 0 (finite) => must guard explicitly.
    const lat = filters.lat;
    const lng = filters.lng;
    if (lat === null || lat === undefined || lat === "") return false;
    if (lng === null || lng === undefined || lng === "") return false;
    return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  }

  buildWhere(filters = {}) {
    const where = { deleted_at: null, status: "published" };
    const and = [];

    // City/Country: accent-insensitive LIKE
    if (filters.city) {
      const q = normalizeText(filters.city);
      if (q) {
        and.push(
          Sequelize.where(
            Sequelize.literal(`translate(lower("Listing"."city"), '${VN_FROM}', '${VN_TO}')`),
            { [Op.like]: `%${q}%` },
          ),
        );
      }
    }

    if (filters.country) {
      const q = normalizeText(filters.country);
      if (q) {
        and.push(
          Sequelize.where(
            Sequelize.literal(`translate(lower("Listing"."country"), '${VN_FROM}', '${VN_TO}')`),
            { [Op.like]: `%${q}%` },
          ),
        );
      }
    }

    if (filters.min_price != null) where.price_per_night = { ...(where.price_per_night || {}), [Op.gte]: filters.min_price };
    if (filters.max_price != null) where.price_per_night = { ...(where.price_per_night || {}), [Op.lte]: filters.max_price };

    if (filters.guests != null) where.max_guests = { [Op.gte]: filters.guests };
    if (filters.bedrooms != null) where.bedrooms = { [Op.gte]: filters.bedrooms };

    if (filters.room_type) where.room_type = { [Op.eq]: filters.room_type };
    if (filters.property_type) where.property_type = { [Op.eq]: filters.property_type };

    // Nearby search ("Near me")
    // Example: /api/v1/listings?lat=10.78&lng=106.70&radius_km=15&sort=distance_asc
    const hasCoords = this.hasCoords(filters);
    const lat = Number(filters.lat);
    const lng = Number(filters.lng);
    const radius = Number(filters.radius_km);
    if (hasCoords) {
      // Only include listings that have coordinates
      and.push({ lat: { [Op.ne]: null } });
      and.push({ lng: { [Op.ne]: null } });

      const r = Number.isFinite(radius) && radius > 0 ? radius : 20;
      const dsql = distanceSql(lat, lng);
      and.push(Sequelize.where(Sequelize.literal(dsql), Op.lte, r));
    }

    if (and.length) where[Op.and] = and;

    return where;
  }
};
