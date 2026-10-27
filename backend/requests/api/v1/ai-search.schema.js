const Joi = require("joi");
const { uuid, dateOnly } = require("./common.schema");

const criteria = Joi.object({
  city: Joi.string().trim().max(120).allow(null),
  guests: Joi.number().integer().min(1).max(100).allow(null),
  max_price: Joi.number().integer().min(1).max(Number.MAX_SAFE_INTEGER).allow(null),
  amenities: Joi.array().items(Joi.string().trim().min(1).max(120)).unique().max(8),
  check_in: dateOnly.allow(null),
  check_out: dateOnly.allow(null),
  near_center: Joi.boolean(),
}).required().custom((value, helpers) => {
  if (Boolean(value.check_in) !== Boolean(value.check_out)) return helpers.error("any.invalid");
  return value.check_in && value.check_out <= value.check_in ? helpers.error("any.invalid") : value;
});

const searchRequest = Joi.object({
  message: Joi.string().trim().min(2).max(500).required(),
  previous: criteria.optional(),
});
const searchClick = Joi.object({ listing_id: uuid.required() });
const searchBooking = Joi.object({ booking_id: uuid.required() });

module.exports = { criteria, searchRequest, searchClick, searchBooking };
