const Repository = require("../core/repository");
const { Listing, Sequelize } = require("../models");
const { Op } = Sequelize;

// Chuẩn hóa dấu tiếng Việt để tìm kiếm mà không cần extension PostgreSQL.
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

module.exports = class ListingRepository extends Repository {
  /** Giới hạn tích lượng giác trong [-1, 1] để sai số làm tròn không gây lỗi acos. */
  distanceSql(lat, lng) {
    const latCol = 'CAST("Listing"."lat" AS double precision)';
    const lngCol = 'CAST("Listing"."lng" AS double precision)';
    return `6371 * acos(LEAST(1.0, GREATEST(-1.0,
    cos(radians(${lat})) * cos(radians(${latCol})) * cos(radians(${lngCol}) - radians(${lng}))
    + sin(radians(${lat})) * sin(radians(${latCol}))
  )))`;
  }
  getModel() {
    return Listing;
  }

  publicReviewAttributes() {
    const visible = `FROM reviews r JOIN users reviewer ON reviewer.id = r.reviewer_id AND reviewer.deleted_at IS NULL
      LEFT JOIN user_settings us ON us.user_id = r.reviewer_id
      WHERE r.listing_id = "Listing".id AND r.deleted_at IS NULL AND r.is_hidden = FALSE
      AND COALESCE(us.show_reviews, TRUE) = TRUE`;
    return [
      [Sequelize.literal(`(SELECT COALESCE(AVG(r.rating), 0) ${visible})`), "avg_rating"],
      [Sequelize.literal(`(SELECT COUNT(1) ${visible})`), "review_count"],
    ];
  }

  hasCoords(filters = {}) {
    // Không chuyển null hoặc chuỗi rỗng thành tọa độ 0.
    const lat = filters.lat;
    const lng = filters.lng;
    if (lat === null || lat === undefined || lat === "") return false;
    if (lng === null || lng === undefined || lng === "") return false;
    return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  }

  buildWhere(filters = {}) {
    const where = { deleted_at: null, status: "published" };
    const and = [];

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

    const hasCoords = this.hasCoords(filters);
    const lat = Number(filters.lat);
    const lng = Number(filters.lng);
    const radius = Number(filters.radius_km);
    if (hasCoords) {

      and.push({ lat: { [Op.ne]: null } });
      and.push({ lng: { [Op.ne]: null } });

      const r = Number.isFinite(radius) && radius > 0 ? radius : 20;
    const dsql = this.distanceSql(lat, lng);
      and.push(Sequelize.where(Sequelize.literal(dsql), Op.lte, r));
    }

    if (and.length) where[Op.and] = and;

    return where;
  }
};
