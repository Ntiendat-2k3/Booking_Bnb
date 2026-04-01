const { Listing, User, Notification, Sequelize } = require("../models");
const { sendEmail } = require("../utils/mailer");
const { Op } = Sequelize;
const { literal } = Sequelize;

function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

module.exports = {
  isUuid,

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
    if (!isUuid(id)) {
      const err = new Error("Invalid listing id");
      err.status = 400;
      throw err;
    }
    const listing = await Listing.findByPk(id, {
      include: [{ model: User, as: "host", attributes: ["id", "full_name", "email"] }]
    });
    if (!listing) {
      const err = new Error("Listing not found");
      err.status = 404;
      throw err;
    }
    if (listing.status !== "pending") {
      const err = new Error("Only pending listing can be approved");
      err.status = 400;
      throw err;
    }
    await listing.update({ status: "published", reject_reason: null });

    // --- Thông báo ---
    try {
      if (listing.host) {
        // Thông báo DB
        await Notification.create({
          user_id: listing.host_id,
          type: "listing_approved",
          title: "Chỗ nghỉ đã được duyệt!",
          message: `Chỗ nghỉ "${listing.title}" của bạn đã được Admin phê duyệt và hiện đã hiển thị trên website.`,
        });

        // Email
        const html = `
          <h3>Xin chào ${listing.host.full_name},</h3>
          <p>Chúc mừng! Chỗ nghỉ <b>"${listing.title}"</b> của bạn đã được duyệt thành công.</p>
          <p>Hiện tại khách hàng đã có thể tìm thấy và đặt phòng tại chỗ nghỉ này.</p>
          <br/>
          <p>Trân trọng,<br/>Đội ngũ Booking BnB</p>
        `;
        await sendEmail(listing.host.email, "Chỗ nghỉ của bạn đã được duyệt thành công", html);
      }
    } catch (msgError) {
      console.error("[Approve] Failed to send notification:", msgError);
    }

    return { listing };
  },

  async reject(id, reason) {
    if (!isUuid(id)) {
      const err = new Error("Invalid listing id");
      err.status = 400;
      throw err;
    }
    const listing = await Listing.findByPk(id, {
      include: [{ model: User, as: "host", attributes: ["id", "full_name", "email"] }]
    });
    if (!listing) {
      const err = new Error("Listing not found");
      err.status = 404;
      throw err;
    }
    if (listing.status !== "pending") {
      const err = new Error("Only pending listing can be rejected");
      err.status = 400;
      throw err;
    }
    const rejReason = reason || "Không đạt yêu cầu";
    await listing.update({ status: "rejected", reject_reason: rejReason });

    // --- Thông báo ---
    try {
      if (listing.host) {
        // Thông báo DB
        await Notification.create({
          user_id: listing.host_id,
          type: "listing_rejected",
          title: "Chỗ nghỉ bị từ chối duyệt",
          message: `Rất tiếc, chỗ nghỉ "${listing.title}" của bạn đã bị từ chối với lý do: ${rejReason}. Vui lòng cập nhật lại thông tin.`,
        });

        // Email
        const html = `
          <h3>Xin chào ${listing.host.full_name},</h3>
          <p>Chúng tôi rất tiếc phải thông báo rằng chỗ nghỉ <b>"${listing.title}"</b> của bạn chưa đạt yêu cầu kiểm duyệt.</p>
          <p><b>Lý do:</b> ${rejReason}</p>
          <p>Vui lòng cập nhật lại thông tin theo yêu cầu và gửi lại để chúng tôi xem xét.</p>
          <br/>
          <p>Trân trọng,<br/>Đội ngũ Booking BnB</p>
        `;
        await sendEmail(listing.host.email, "Thông tin duyệt chỗ nghỉ", html);
      }
    } catch (msgError) {
      console.error("[Reject] Failed to send notification:", msgError);
    }

    return { listing };
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

