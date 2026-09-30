let client;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw Object.assign(new Error("Stripe is not configured"), { status: 503 });
  }
  client ||= require("stripe")(process.env.STRIPE_SECRET_KEY, { timeout: 10000, maxNetworkRetries: 2 });
  return client;
}

module.exports = { getStripe };
