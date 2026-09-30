const Joi = require("joi");
const { uuid, dateOnly } = require("./common.schema");

const dates = { check_in: dateOnly, check_out: dateOnly, guests_count: Joi.number().integer().min(1).max(100) };
const createBookingSchema = Joi.object({
  listing_id: uuid, listingId: uuid,
  ...dates, check_in: dateOnly.required(), check_out: dateOnly.required(),
}).xor("listing_id", "listingId");
const updateBookingSchema = Joi.object(dates).min(1);

module.exports = { createBookingSchema, updateBookingSchema };
