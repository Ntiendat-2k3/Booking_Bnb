const { Listing, User, Notification, Sequelize, sequelize } = require("../models");
const { enqueue } = require("./background_job.service");
const { message } = require("../templates/emails");
const {
  literal
} = Sequelize;
const { isUuid } = require("../utils/validators");

module.exports = {

  async list({ status } = {}) {
    const where = { deleted_at: null };
    if (status && status !== "all") where.status = status;

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
        [
          literal(`(
            SELECT COUNT(1)
            FROM listing_images li
            WHERE li.listing_id = "Listing".id
          )`),
          "image_count",
        ],
      ],
    };

    const items = await Listing.findAll({
      where,
      attributes: attrs,
      include: [{ model: User, as: "host", attributes: ["id", "full_name", "email"] }],
      order: [["created_at", "DESC"]],
      limit: 300,
    });

    return { items };
  },

  async approve(id) {
    return this.moderate(id, "published");
  },

  async reject(id, reason) {
    return this.moderate(id, "rejected", reason || "Không đạt yêu cầu");
  },

  async moderate(id, status, reason = null) {
    if (!isUuid(id)) throw Object.assign(new Error("Invalid listing id"), { status: 400 });
    return sequelize.transaction(async (transaction) => {
      const listing = await Listing.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!listing) throw Object.assign(new Error("Listing not found"), { status: 404 });
      if (listing.status !== "pending") throw Object.assign(new Error("Only pending listing can be moderated"), { status: 409 });
      await listing.update({ status, reject_reason: reason }, { transaction });
      const host = await User.findByPk(listing.host_id, { attributes: ["email"], transaction });
      const title = status === "published" ? "Chỗ nghỉ đã được duyệt!" : "Chỗ nghỉ bị từ chối duyệt";
      const text = status === "published" ? "Chỗ nghỉ đã hiển thị trên website." : reason;
      await Notification.create({ user_id: listing.host_id, type: status === "published" ? "listing_approved" : "listing_rejected", title, message: text }, { transaction });
      if (host) await enqueue("send_email", { to: host.email, subject: title, html: message(title, [listing.title, text]) }, transaction);
      return { listing };
    });
  },

  async bulkApprove(ids) {
    if (!Array.isArray(ids)) throw new Error("Ids must be an array");
    const results = [];
    for (const id of ids) {
      try {
        const res = await this.approve(id);
        results.push({ id, status: "success", title: res.listing?.title });
      } catch (err) {
        results.push({ id, status: "error", message: err.message });
      }
    }
    return { results };
  },

  async bulkReject(ids, reason) {
    if (!Array.isArray(ids)) throw new Error("Ids must be an array");
    const results = [];
    for (const id of ids) {
      try {
        const res = await this.reject(id, reason);
        results.push({ id, status: "success", title: res.listing?.title });
      } catch (err) {
        results.push({ id, status: "error", message: err.message });
      }
    }
    return { results };
  },
};
