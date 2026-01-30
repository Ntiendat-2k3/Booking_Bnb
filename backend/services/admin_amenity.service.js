const { Amenity, Sequelize } = require("../models");
const { literal } = Sequelize;

function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function slugifyBase(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

async function ensureUniqueSlug(base, excludeId = null) {
  let slug = base || "amenity";
  let n = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const where = { slug };
    if (excludeId) where.id = { [Sequelize.Op.ne]: excludeId };

    const exists = await Amenity.findOne({ where, attributes: ["id"] });
    if (!exists) return slug;

    n += 1;
    const suffix = "-" + n;
    slug = (base || "amenity").slice(0, Math.max(1, 120 - suffix.length)) + suffix;
  }
}

module.exports = {
  async list({ q = null, active = "all" } = {}) {
    const where = {};
    if (active === "active") where.is_active = true;
    if (active === "inactive") where.is_active = false;

    if (q) {
      const s = String(q).trim();
      if (s) {
        where[Sequelize.Op.or] = [
          { name: { [Sequelize.Op.iLike]: `%${s}%` } },
          { slug: { [Sequelize.Op.iLike]: `%${s}%` } },
          { group: { [Sequelize.Op.iLike]: `%${s}%` } },
        ];
      }
    }

    const items = await Amenity.findAll({
      where,
      attributes: {
        include: [
          [
            literal(`(
              SELECT COUNT(1)
              FROM listing_amenities la
              WHERE la.amenity_id = "Amenity".id
            )`),
            "listing_count",
          ],
        ],
      },
      order: [
        ["group", "ASC"],
        ["name", "ASC"],
      ],
      limit: 1000,
    });

    return { items };
  },

  async create({ name, group = null, is_active = true } = {}) {
    const nm = String(name || "").trim();
    if (!nm) {
      const err = new Error("name is required");
      err.status = 400;
      throw err;
    }

    const base = slugifyBase(nm);
    const slug = await ensureUniqueSlug(base);

    const amenity = await Amenity.create({
      name: nm,
      slug,
      group: group ? String(group).trim() : null,
      is_active: is_active !== false,
    });

    return { amenity };
  },

  async update(id, { name, group, is_active } = {}) {
    if (!isUuid(id)) {
      const err = new Error("Invalid amenity id");
      err.status = 400;
      throw err;
    }

    const amenity = await Amenity.findByPk(id);
    if (!amenity) {
      const err = new Error("Amenity not found");
      err.status = 404;
      throw err;
    }

    const patch = {};
    if (name !== undefined) {
      const nm = String(name || "").trim();
      if (!nm) {
        const err = new Error("name is required");
        err.status = 400;
        throw err;
      }
      patch.name = nm;

      const base = slugifyBase(nm);
      patch.slug = await ensureUniqueSlug(base, id);
    }

    if (group !== undefined) patch.group = group ? String(group).trim() : null;
    if (is_active !== undefined) patch.is_active = is_active !== false;

    await amenity.update(patch);
    return { amenity };
  },

  async setActive(id, isActive) {
    if (!isUuid(id)) {
      const err = new Error("Invalid amenity id");
      err.status = 400;
      throw err;
    }
    const amenity = await Amenity.findByPk(id);
    if (!amenity) {
      const err = new Error("Amenity not found");
      err.status = 404;
      throw err;
    }
    await amenity.update({ is_active: isActive === true });
    return { amenity };
  },
};
