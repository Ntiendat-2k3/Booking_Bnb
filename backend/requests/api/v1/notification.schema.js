const Joi = require("joi");

module.exports = Joi.object({
  messages: Joi.boolean(), bookings: Joi.boolean(),
  calls: Joi.boolean(), reminders: Joi.boolean(), offers: Joi.boolean(),
}).min(1);
