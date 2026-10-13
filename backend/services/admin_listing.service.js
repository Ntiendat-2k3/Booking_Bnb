const { Listing, ListingImage, ListingAmenity, User, Notification, Sequelize, sequelize } = require("../models");
const { enqueue } = require("./background_job.service");
const { message } = require("../templates/emails");
const {
  literal
} = Sequelize;
const { isUuid } = require("../utils/validators");
const Repository = require("../core/repository");

module.exports = {

  async list({ status, q = null, page = 1, limit = 300 } = {}) {
    const searchWhere = {
      deleted_at: null,
      ...Repository.searchWhere(q, ["Listing.id", "Listing.title", "Listing.city", "host.email", "host.full_name"]),
    };
    const where = { ...searchWhere };
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

    const [rows, statusCounts] = await Promise.all([
      Listing.findAll({
      where,
      attributes: attrs,
      include: [{ model: User, as: "host", attributes: ["id", "full_name", "email"] }],
      order: [["created_at", "DESC"]],
      limit, offset: (page - 1) * limit,
      }),
      Listing.count({
        where: searchWhere,
        include: [{ model: User, as: "host", attributes: [] }],
        group: ["Listing.status"],
      }),
    ]);
    const statuses = { pending: 0, published: 0, paused: 0, draft: 0, rejected: 0 };
    for (const row of statusCounts) if (row.status in statuses) statuses[row.status] = Number(row.count);
    const total = status === "all" || !status
      ? statusCounts.reduce((sum, row) => sum + Number(row.count), 0)
      : statuses[status] || 0;
    return { items: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit), statuses } };
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
      if (status === "published") {
        const [images, amenities] = await Promise.all([
          ListingImage.count({ where: { listing_id: id }, transaction }),
          ListingAmenity.count({ where: { listing_id: id }, transaction }),
        ]);
        if (!images || !amenities) throw Object.assign(new Error("Phòng cần ít nhất một ảnh và một tiện nghi trước khi duyệt"), { status: 400 });
      }
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
