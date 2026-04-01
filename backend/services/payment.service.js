const { Payment, Booking, User, Notification, Listing } = require("../models");
const { sendEmail } = require("../utils/mailer");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = {
  async createStripePayment({ bookingId, userId, req }) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      const err = new Error("Booking not found");
      err.status = 404;
      throw err;
    }
    if (String(booking.guest_id) !== String(userId)) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    if (booking.status !== "pending_payment") {
      const err = new Error("Booking is not pending payment");
      err.status = 400;
      throw err;
    }

    const amount = Number(booking.total_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      const err = new Error("Invalid booking amount");
      err.status = 500;
      throw err;
    }

    const payment = await Payment.create({
      booking_id: booking.id,
      provider: "stripe",
      status: "pending",
      amount: String(amount),
      currency: booking.currency || "VND",
    });

    const frontendBase = process.env.FRONTEND_BASE_URL || "http://localhost:3001";
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: (booking.currency || "vnd").toLowerCase(),
          product_data: { 
            name: `Booking ${booking.id}`,
            description: `Thanh toán phòng trên hệ thống`
          },
          unit_amount: Math.round(amount), // VND no decimals in Stripe
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${frontendBase}/trips?payment=success&bookingId=${booking.id}`,
      cancel_url: `${frontendBase}/trips?payment=failed&bookingId=${booking.id}`,
      client_reference_id: String(payment.id),
      metadata: {
        bookingId: String(booking.id),
        paymentId: String(payment.id)
      }
    });

    payment.provider_txn_ref = session.id;
    payment.payload = { request: { id: session.id, url: session.url } };
    await payment.save();

    return { payment, payment_url: session.url };
  },

  async handleStripeWebhook(event) {
    console.log("[PaymentService] Handling Stripe event:", event.id, "Type:", event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const paymentId = session.client_reference_id;

      if (!paymentId) {
        console.error("[PaymentService] Error: No client_reference_id found in session");
        return { success: false, reason: "No client_reference_id" };
      }

      const payment = await Payment.findByPk(paymentId);
      if (!payment) {
        console.error("[PaymentService] Error: Payment not found for ID:", paymentId);
        return { success: false, reason: "Payment not found" };
      }

      console.log(`[PaymentService] Processing payment ${paymentId} for booking ${payment.booking_id}`);

      if (payment.status === "succeeded") {
        console.log(`[PaymentPlugin] Payment ${paymentId} already marked as succeeded.`);
        return { success: true, alreadyPaid: true };
      }

      payment.status = "succeeded";
      payment.paid_at = new Date();
      payment.provider_transaction_no = session.payment_intent;
      payment.payload = { ...(payment.payload || {}), webhook: event };
      await payment.save();
      console.log(`[PaymentPlugin] Payment ${paymentId} updated to succeeded.`);

      const booking = await Booking.findByPk(payment.booking_id, {
        include: [
          { model: User, as: "guest", attributes: ["id", "full_name", "email"] },
          { 
            model: Listing, 
            as: "listing", 
            attributes: ["id", "title", "host_id"],
            include: [{ model: User, as: "host", attributes: ["id", "full_name", "email"] }]
          }
        ]
      });

      if (booking) {
        console.log(`[PaymentPlugin] Updating status for booking ${booking.id} to confirmed.`);
        booking.status = "confirmed";
        await booking.save();
        console.log(`[PaymentPlugin] Booking ${booking.id} confirmed.`);


        // --- Thông báo ---
        try {
          // 1. Thông báo cho Guest
          if (booking.guest) {
            await Notification.create({
              user_id: booking.guest_id,
              type: "booking_confirmed",
              title: "Thanh toán thành công!",
              message: `Đơn đặt phòng "${booking.listing?.title}" của bạn đã được xác nhận thành công. Chúc bạn có một chuyến đi vui vẻ!`,
            });

            const guestHtml = `
              <h3>Chào ${booking.guest.full_name},</h3>
              <p>Yêu cầu đặt phòng của bạn cho <b>"${booking.listing?.title}"</b> đã được thanh toán thành công.</p>
              <p><b>Mã đơn đặt:</b> ${booking.id}</p>
              <p><b>Ngày nhận phòng:</b> ${booking.check_in}</p>
              <p><b>Ngày trả phòng:</b> ${booking.check_out}</p>
              <br/>
              <p>Trân trọng,<br/>Đội ngũ Booking BnB</p>
            `;
            await sendEmail(booking.guest.email, "Xác nhận đặt phòng thành công", guestHtml);
          }

          // 2. Thông báo cho Host
          if (booking.listing?.host) {
            await Notification.create({
              user_id: booking.listing.host_id,
              type: "new_booking",
              title: "Có lượt đặt phòng mới!",
              message: `Khách hàng ${booking.guest?.full_name || "ẩn danh"} vừa đặt thành công chỗ nghỉ "${booking.listing.title}" của bạn.`,
            });

            const hostHtml = `
              <h3>Chào ${booking.listing.host.full_name},</h3>
              <p>Duyệt tin tốt! Chỗ nghỉ <b>"${booking.listing.title}"</b> của bạn vừa có một lượt đặt phòng mới thành công.</p>
              <p><b>Khách hàng:</b> ${booking.guest?.full_name || "Airbnb User"}</p>
              <p><b>Ngày nhận phòng:</b> ${booking.check_in}</p>
              <p><b>Ngày trả phòng:</b> ${booking.check_out}</p>
              <br/>
              <p>Hãy chuẩn bị sẵn sàng để đón tiếp khách nhé!</p>
              <p>Trân trọng,<br/>Đội ngũ Booking BnB</p>
            `;
            await sendEmail(booking.listing.host.email, "Thông báo lượt đặt phòng mới", hostHtml);
          }
        } catch (msgError) {
          console.error("[PaymentWebhook] Notification error:", msgError);
        }
      }

      return { success: true, payment, bookingUpdated: !!booking };
    }
    
    return { success: true, message: "Unhandled event type" };
  }
};

