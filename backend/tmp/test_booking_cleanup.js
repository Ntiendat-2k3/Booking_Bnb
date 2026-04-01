require('dotenv').config();
const { cleanupExpiredBookings } = require('../utils/bookingCleanup');
const { Booking, Sequelize } = require('../models');
const { Op } = Sequelize;

async function test() {
  console.log("Starting cleanup test...");
  
  // Create a dummy booking that is older than 60 minutes
  const oldDate = new Date(Date.now() - 70 * 60 * 1000); // 70 mins ago
  
  try {
    // We need a real listing_id and guest_id to satisfy FK constraints if we create a real record.
    // Instead, let's just count how many would be affected OR assume there are some.
    // Better: let's query how many pending bookings are older than 60 mins.
    
    const count = await Booking.count({
      where: {
        status: 'pending_payment',
        created_at: { [Op.lt]: new Date(Date.now() - 60 * 60 * 1000) }
      }
    });
    
    console.log(`Found ${count} bookings older than 60 mins.`);
    
    await cleanupExpiredBookings();
    
    console.log("Cleanup executed.");
    
    const countAfter = await Booking.count({
      where: {
        status: 'pending_payment',
        created_at: { [Op.lt]: new Date(Date.now() - 60 * 60 * 1000) }
      }
    });
    
    console.log(`After cleanup: ${countAfter} pending bookings older than 60 mins.`);
    
    if (count > 0 && countAfter === 0) {
      console.log("SUCCESS: Old bookings were cancelled.");
    } else if (count === 0) {
      console.log("No old bookings found to test, but script ran fine.");
    } else {
      console.log("CHECK: Count after cleanup is not 0. Maybe they weren't cancelled?");
    }
    
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    process.exit(0);
  }
}

test();
