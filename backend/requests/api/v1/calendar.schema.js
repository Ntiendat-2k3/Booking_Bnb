const Joi = require("joi");
const { uuid, dateOnly } = require("./common.schema");

const range = {
  start_date: dateOnly.required(),
  end_date: dateOnly.required(),
};
const calendarQuery = Joi.object({ listing_id: uuid.required(), ...range });
const publicCalendarQuery = Joi.object(range);
const blockCalendar = Joi.object({
  listing_id: uuid.required(), ...range,
  reason: Joi.string().trim().max(255).allow("", null),
});
const unblockCalendar = Joi.object({ listing_id: uuid.required(), ...range });
const publicCalendarVisibility = Joi.object({ listing_id: uuid.required(), visible: Joi.boolean().required() });
const amount = Joi.number().integer().min(1).max(Number.MAX_SAFE_INTEGER);
const weekdayPrices = Joi.object({ listing_id: uuid.required(),
  friday: amount.allow(null).required(), saturday: amount.allow(null).required(), sunday: amount.allow(null).required() });
const dailyPrice = Joi.object({ listing_id: uuid.required(), date: dateOnly.required(),
  price_per_night: amount.allow(null).required() });
const pricingRange = Joi.object({ listing_id: uuid.required(), ...range,
  kind: Joi.string().valid("range", "season", "holiday").required(),
  name: Joi.string().trim().max(120).allow("", null),
  price_per_night: amount.allow(null), min_nights: Joi.number().integer().min(1).max(365).allow(null),
  max_nights: Joi.number().integer().min(1).max(365).allow(null),
}).custom((value, helpers) => value.end_date <= value.start_date ||
  (value.price_per_night == null && value.min_nights == null && value.max_nights == null) ||
  (value.min_nights != null && value.max_nights != null && value.min_nights > value.max_nights)
  ? helpers.error("any.invalid") : value);
const removePricingRange = Joi.object({ listing_id: uuid.required() });
const pricingQuote = Joi.object({ check_in: dateOnly.required(), check_out: dateOnly.required() });

module.exports = { calendarQuery, publicCalendarQuery, blockCalendar, unblockCalendar,
  publicCalendarVisibility, weekdayPrices, dailyPrice, pricingRange, removePricingRange, pricingQuote };
