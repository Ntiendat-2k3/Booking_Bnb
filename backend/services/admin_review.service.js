const { Review, Listing, User, Booking, Sequelize } = require("../models");
const { Op } = Sequelize;
const { isUuid } = require("../utils/validators");

module.exports = {
  async list({ visibility = "all", q = null, limit = 200 } = {}) {
    const where = {};
    if (visibility === "visible") where.is_hidden = false;
    if (visibility === "hidden") where.is_hidden = true;

    const rows = await Review.findAll({
      where,
      include: [
        { model: Listing, as: "listing", attributes: ["id", "title"] },
        { model: User, as: "reviewer", attributes: ["id", "email", "full_name", "avatar_url"] },
        { model: Booking, as: "booking", attributes: ["id", "status", "check_in", "check_out"] },
      ],
      order: [["created_at", "DESC"]],
      limit: Math.min(500, Math.max(1, Number(limit || 200))),
    });

    let items = rows.map((x) => (x.toJSON ? x.toJSON() : x));

    const s = String(q || "").trim().toLowerCase();
    if (s) {
      items = items.filter((r) => {
        return (
          String(r.id || "").toLowerCase().includes(s) ||
          String(r.listing?.title || "").toLowerCase().includes(s) ||
          String(r.reviewer?.email || "").toLowerCase().includes(s) ||
          String(r.reviewer?.full_name || "").toLowerCase().includes(s) ||
          String(r.comment || "").toLowerCase().includes(s)
        );
      });
    }

    return { items };
  },

  async setHidden(id, hidden) {
    if (!isUuid(id)) {
      const err = new Error("Invalid review id");
      err.status = 400;
      throw err;
    }
    const review = await Review.findByPk(id);
    if (!review) {
      const err = new Error("Review not found");
      err.status = 404;
      throw err;
    }
    await review.update({ is_hidden: hidden === true, updated_at: new Date() });
    return { review };
  },

  async remove(id) {
    if (!isUuid(id)) {
      const err = new Error("Invalid review id");
      err.status = 400;
      throw err;
    }
    const review = await Review.findByPk(id);
    if (!review) {
      const err = new Error("Review not found");
      err.status = 404;
      throw err;
    }
    const listingId = review.listing_id;
    await review.destroy();
    return { ok: true, listing_id: listingId };
  },

  async bulkSetHidden(ids, hidden) {
    if (!Array.isArray(ids)) throw new Error("Ids must be an array");
    const results = [];
    for (const id of ids) {
      try {
        await this.setHidden(id, hidden);
        results.push({ id, status: "success" });
      } catch (err) {
        results.push({ id, status: "error", message: err.message });
      }
    }
    return { results };
  },

  async bulkRemove(ids) {
    if (!Array.isArray(ids)) throw new Error("Ids must be an array");
    const results = [];
    for (const id of ids) {
      try {
        await this.remove(id);
        results.push({ id, status: "success" });
      } catch (err) {
        results.push({ id, status: "error", message: err.message });
      }
    }
    return { results };
  },
};
