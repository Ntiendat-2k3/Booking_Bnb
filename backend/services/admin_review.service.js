const Repository = require("../core/repository");
const { Review, Listing, User, Booking } = require("../models");

const { isUuid } = require("../utils/validators");

module.exports = {
  async list({ visibility = "all", rating = "all", q = null, limit = 200, page = 1 } = {}) {
    const where = Repository.searchWhere(q, ["Review.id","Review.booking_id","Review.comment","listing.title","reviewer.email","reviewer.full_name"]);
    if (visibility === "visible") where.is_hidden = false;
    if (visibility === "hidden") where.is_hidden = true;
    if (rating !== "all") where.rating = Number(rating);

    const include = [
        { model: Listing, as: "listing", attributes: ["id", "title"] },
        { model: User, as: "reviewer", attributes: ["id", "email", "full_name", "avatar_url"] },
        { model: Booking, as: "booking", attributes: ["id", "status", "check_in", "check_out"] },
    ];
    const [rows, reviewCounts] = await Promise.all([
      Review.findAll({
        where, include, order: [["created_at", "DESC"]],
        limit, offset: (page - 1) * limit,
      }),
      Review.count({
        where,
        include: include.map(({ model, as }) => ({ model, as, attributes: [] })),
        group: ["Review.rating", "Review.is_hidden"],
      }),
    ]);
    const summary = { fiveStars: 0, visible: 0, hidden: 0 };
    for (const row of reviewCounts) {
      const amount = Number(row.count);
      if (Number(row.rating) === 5) summary.fiveStars += amount;
      if (row.is_hidden) summary.hidden += amount;
      else summary.visible += amount;
    }
    const total = reviewCounts.reduce((sum, row) => sum + Number(row.count), 0);
    return { items: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit), summary } };
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
