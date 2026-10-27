const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

test("PostgreSQL: đặt trùng lịch, webhook lặp và hủy đơn đã thanh toán", {
  skip: process.env.BOOKING_TEST_DATABASE !== "1" || process.env.NODE_ENV !== "test" ||
    !process.env.DB_TEST_NAME,
}, async () => {
  const { User, Listing, Booking, Payment, Refund, BackgroundJob, sequelize } = require("../models");
  const bookings = require("../services/booking.service");
  const payments = require("../services/payment.service");
  const suffix = randomUUID().slice(0, 8);
  try {
    const guest = await User.create({ email: `booking_guest_${suffix}@example.invalid`,
      username: `booking_guest_${suffix}`, full_name: "Khách thử nghiệm", role: "guest",
      status: "active", provider: "local" });
    const host = await User.create({ email: `booking_host_${suffix}@example.invalid`,
      username: `booking_host_${suffix}`, full_name: "Chủ nhà thử nghiệm", role: "host",
      status: "active", provider: "local" });
    const listing = await Listing.create({ host_id: host.id, title: "Phòng kiểm thử thanh toán",
      city: "Hà Nội", country: "Việt Nam", price_per_night: 100000,
      max_guests: 2, status: "published" });
    const checkIn = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    const checkOut = new Date(Date.now() + 62 * 86400000).toISOString().slice(0, 10);
    const input = { userId: guest.id, listingId: listing.id,
      check_in: checkIn, check_out: checkOut, guests_count: 1 };
    const attempts = await Promise.allSettled([bookings.create(input), bookings.create(input)]);
    assert.equal(attempts.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(attempts.find((result) => result.status === "rejected").reason.status, 409);
    const booking = attempts.find((result) => result.status === "fulfilled").value.booking;
    assert.equal(await Booking.count({ where: { listing_id: listing.id } }), 1);

    const intentId = `pi_${randomUUID()}`;
    const payment = await Payment.create({ booking_id: booking.id, provider: "stripe",
      status: "pending", amount: booking.total_amount, currency: "VND",
      provider_txn_ref: intentId, payload: {} });
    const event = { id: `evt_${randomUUID()}`, type: "payment_intent.succeeded",
      data: { object: { id: intentId, status: "succeeded",
        amount_received: Number(booking.total_amount), currency: "vnd",
        metadata: { paymentId: payment.id } } } };
    await payments.handleStripeWebhook(event);
    await payments.handleStripeWebhook(event);
    assert.equal((await Booking.findByPk(booking.id)).status, "confirmed");
    assert.equal((await Payment.findByPk(payment.id)).status, "succeeded");
    const confirmationJobs = await BackgroundJob.findAll({ where: { type: "booking_confirmation" } });
    assert.equal(confirmationJobs.filter((job) => job.payload?.bookingId === booking.id).length, 1);

    await bookings.cancel({ userId: guest.id, bookingId: booking.id, reason: "Đổi kế hoạch" });
    await bookings.cancel({ userId: guest.id, bookingId: booking.id, reason: "Gửi lại" });
    assert.equal((await Booking.findByPk(booking.id)).status, "cancelled");
    const refunds = await Refund.findAll({ where: { booking_id: booking.id } });
    assert.equal(refunds.length, 1);
    const refundJobs = await BackgroundJob.findAll({ where: { type: "stripe_refund" } });
    assert.equal(refundJobs.filter((job) => job.payload?.refundId === refunds[0].id).length, 1);
  } finally {
    await sequelize.close();
  }
});
