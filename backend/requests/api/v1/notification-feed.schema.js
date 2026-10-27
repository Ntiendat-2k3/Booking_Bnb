const Joi = require("joi");

module.exports = Joi.object({
  category: Joi.string().valid("all", "messages", "bookings", "listings", "system").default("all"),
  limit: Joi.number().integer().min(1).max(50).default(20),
  cursor: Joi.string().max(200),
});
