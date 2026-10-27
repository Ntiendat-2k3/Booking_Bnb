const Joi = require("joi");
const { uuid, dateOnly } = require("./common.schema");

const analyticsQuery = Joi.object({
  period: Joi.string().valid("day", "month", "quarter", "year").default("month"),
  date: dateOnly,
});
const listingView = Joi.object({ visitor_key: uuid.required() });

module.exports = { analyticsQuery, listingView };
