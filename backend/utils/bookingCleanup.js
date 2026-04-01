const { Booking, Sequelize } = require("../models");
const { Op } = Sequelize;

/**
 * Marks unpaid bookings older than HOLD_MINUTES as cancelled.
 */
async function cleanupExpiredBookings() {
  try {
    const holdMinutes = Number(process.env.BOOKING_HOLD_MINUTES || 15);
    const cutoff = new Date(Date.now() - holdMinutes * 60 * 1000);

    const [updatedCount] = await Booking.update(
      { status: "cancelled" },
      {
        where: {
          status: "pending_payment",
          created_at: { [Op.lt]: cutoff },
        },
      }
    );

    if (updatedCount > 0) {
      console.log(`[BookingCleanup] Cancelled ${updatedCount} expired bookings.`);
    }
  } catch (error) {
    console.error("[BookingCleanup] Error during cleanup:", error);
  }
}

/**
 * Starts the periodic cleanup task.
 * @param {number} intervalMs - How often to run the cleanup (default 5 minutes)
 */
function startBookingCleanup(intervalMs = 5 * 60 * 1000) {
  console.log(`[BookingCleanup] Scheduled every ${intervalMs / 1000 / 60} minutes.`);
  // Run once immediately on start
  cleanupExpiredBookings();
  // Then periodically
  setInterval(cleanupExpiredBookings, intervalMs);
}

module.exports = {
  cleanupExpiredBookings,
  startBookingCleanup,
};
