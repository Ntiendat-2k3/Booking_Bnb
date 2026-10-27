/** Mã xác minh email được dẫn xuất từ khóa bí mật và ID token; DB và job không lưu mã thô. */
const crypto = require("node:crypto");
const QRCode = require("qrcode");
const { Booking, BookingStayToken, Listing, Payment, User, sequelize } = require("../models");
const BookingRepository = require("../repositories/booking.repository");
const { bookingCode } = require("../transformers/booking.transformer");
const { enqueue } = require("./background_job.service");
const { message } = require("../templates/emails");
const { sendEmail } = require("../utils/mailer");
const httpError = require("../utils/httpError");

const bookingRepo = new BookingRepository();
const RESEND_MINUTES = 10;

function rawToken(bookingId, tokenId) {
  const secret = process.env.STAY_QR_SECRET || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 16) throw new Error("A QR signing secret must be at least 16 characters");
  return crypto.createHmac("sha256", secret).update(`${bookingId}:${tokenId}`).digest("base64url");
}

function tokenHash(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Gọi trong transaction xác nhận booking; webhook lặp dùng cùng token và không tạo job thứ hai. */
async function queueConfirmation(booking, transaction) {
  const now = new Date();
  let token = await BookingStayToken.findOne({ where: { booking_id: booking.id, purpose: "verify",
    revoked_at: null, used_at: null }, transaction, lock: transaction.LOCK.UPDATE });
  if (token && (new Date(token.expires_at) <= now ||
      tokenHash(rawToken(booking.id, token.id)) !== token.token_hash)) {
    await token.update({ revoked_at: now }, { transaction });
    token = null;
  }
  if (!token) {
    const id = crypto.randomUUID();
    token = await BookingStayToken.create({ id, booking_id: booking.id, purpose: "verify",
      token_hash: tokenHash(rawToken(booking.id, id)),
      expires_at: new Date(`${booking.check_out}T17:00:00.000Z`) }, { transaction });
  }
  if (!booking.confirmation_email_queued_at) {
    await enqueue("booking_confirmation", { bookingId: booking.id, tokenId: token.id }, transaction);
    await booking.update({ confirmation_email_queued_at: now }, { transaction });
  }
  return token;
}

module.exports = {
  queueConfirmation,

  /** Khách có thể xem lại QR dài hạn; mã cũ được vô hiệu khi booking hủy hoặc đã check-in. */
  async getForGuest({ guestId, bookingId }) {
    return sequelize.transaction(async (transaction) => {
      const { booking } = await bookingRepo.lockForMutation(bookingId, transaction, guestId);
      if (booking.status !== "confirmed" || booking.stay_status !== "not_checked_in")
        throw httpError(409, "Verification QR is unavailable");
      const token = await queueConfirmation(booking, transaction);
      if (new Date(token.expires_at) <= new Date()) throw httpError(410, "Verification QR expired");
      return { token: rawToken(booking.id, token.id), expires_at: new Date(token.expires_at).toISOString() };
    });
  },

  async resend({ guestId, bookingId }) {
    return sequelize.transaction(async (transaction) => {
      const { booking } = await bookingRepo.lockForMutation(bookingId, transaction, guestId);
      if (booking.status !== "confirmed" || booking.stay_status !== "not_checked_in")
        throw httpError(409, "Confirmation email is unavailable");
      if (booking.confirmation_email_queued_at &&
          new Date(booking.confirmation_email_queued_at).getTime() > Date.now() - RESEND_MINUTES * 60000)
        throw httpError(429, "Please wait before resending confirmation");
      const token = await queueConfirmation(booking, transaction);
      if (new Date(token.expires_at) <= new Date()) throw httpError(410, "Verification QR expired");
      await enqueue("booking_confirmation", { bookingId: booking.id, tokenId: token.id }, transaction);
      await booking.update({ confirmation_email_queued_at: new Date() }, { transaction });
      return { queued: true };
    });
  },

  async rotate({ guestId, bookingId }) {
    return sequelize.transaction(async (transaction) => {
      const { booking } = await bookingRepo.lockForMutation(bookingId, transaction, guestId);
      if (booking.status !== "confirmed" || booking.stay_status !== "not_checked_in")
        throw httpError(409, "Verification QR is unavailable");
      const hadEmailJob = Boolean(booking.confirmation_email_queued_at);
      await BookingStayToken.update({ revoked_at: new Date() }, { where: {
        booking_id: booking.id, purpose: "verify", revoked_at: null, used_at: null,
      }, transaction });
      const token = await queueConfirmation(booking, transaction);
      if (new Date(token.expires_at) <= new Date()) throw httpError(410, "Verification QR expired");
      if (hadEmailJob) await enqueue("booking_confirmation", {
        bookingId: booking.id, tokenId: token.id,
      }, transaction);
      await booking.update({ confirmation_email_queued_at: new Date() }, { transaction });
      return { token: rawToken(booking.id, token.id),
        expires_at: new Date(token.expires_at).toISOString() };
    });
  },

  /** Worker đọc lại trạng thái sau commit; booking hủy không thể gửi mã hợp lệ khi retry. */
  async sendConfirmation({ bookingId, tokenId }) {
    const booking = await Booking.findByPk(bookingId);
    const token = await BookingStayToken.findByPk(tokenId);
    if (!booking || !token || token.booking_id !== booking.id || booking.status !== "confirmed" ||
        token.revoked_at || token.used_at || new Date(token.expires_at) <= new Date()) return;
    const payment = await Payment.findOne({ where: { booking_id: booking.id,
      provider: booking.payment_method || "stripe",
      status: booking.payment_method === "property" ? ["pending", "succeeded"] : "succeeded" } });
    if (!payment || (booking.payment_method === "property"
      ? !["pending", "succeeded"].includes(payment.status) : payment.status !== "succeeded")) return;
    const [listing, guest] = await Promise.all([
      Listing.findByPk(booking.listing_id), User.findByPk(booking.guest_id),
    ]);
    if (!listing || !guest?.email) return;
    const host = await User.findByPk(listing.host_id);
    const raw = rawToken(booking.id, token.id);
    if (tokenHash(raw) !== token.token_hash) return;
    const image = await QRCode.toDataURL(raw, { margin: 2, width: 240,
      errorCorrectionLevel: "M" });
    const paid = payment.status === "succeeded";
    const title = "Xác nhận đặt phòng Booking BnB";
    const details = message(title, [
      `Mã đơn: ${bookingCode(booking.reference_number)}`,
      `Khách: ${guest.full_name || ""}`,
      `Chỗ nghỉ: ${listing.title}; ${listing.address || ""}, ${listing.city || ""}`,
      `Ngày nhận phòng: ${booking.check_in}; ngày trả phòng: ${booking.check_out}`,
      `Số khách: ${booking.guests_count}`,
      `Tổng tiền: ${booking.total_amount} ${booking.currency}`,
      `Phương thức: ${booking.payment_method === "property" ? "trả tại chỗ nghỉ" : "Stripe"}`,
      `Liên hệ Host: ${host?.email || "xem trong mục Chuyến đi"}`,
      paid ? "Đã thanh toán. QR chỉ dùng để xác minh booking." :
        `Chưa thanh toán. Cần trả ${booking.total_amount} ${booking.currency} tại chỗ nghỉ trước khi nhận phòng.`,
    ]);
    const tripsUrl = new URL("/trips", process.env.FRONTEND_URL || "http://localhost:3001").toString();
    const html = `${details}<p><img src="${image}" alt="Mã QR xác minh đặt phòng" width="240" height="240" /></p>` +
      `<p>Nếu ứng dụng email không hiển thị ảnh, <a href="${tripsUrl}">mở Chuyến đi để xem mã QR</a>.</p>`;
    const cid = `booking-qr-${token.id}@booking-bnb`;
    await sendEmail(guest.email, title, html, {
      smtpHtml: html.replace(`src="${image}"`, `src="cid:${cid}"`),
      attachments: [{ filename: "booking-qr.png", content: Buffer.from(image.split(",")[1], "base64"),
        cid, contentType: "image/png" }],
    });
  },
};
