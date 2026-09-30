const bookingService = require("../services/booking.service");

async function cleanupExpiredBookings() {
  try { await bookingService.cleanupExpiredBookings(); }
  catch (error) { console.error("[booking-cleanup] Dọn booking hết hạn thất bại:", error.name); }
}

function startBookingCleanup(intervalMs = 60000) {
  let active;
  let stopped = false;
  const tick = () => {
    if (stopped || active) return;
    active = cleanupExpiredBookings().finally(() => { active = null; });
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  tick();
  return async () => { stopped = true; clearInterval(timer); await active; };
}

module.exports = { startBookingCleanup, cleanupExpiredBookings };
