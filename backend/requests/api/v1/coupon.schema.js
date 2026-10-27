const Joi = require("joi");
const { uuid } = require("./common.schema");

const amount = Joi.number().integer().min(1).max(Number.MAX_SAFE_INTEGER);
const createCoupon = Joi.object({
  code: Joi.string().trim().pattern(/^[A-Za-z0-9_-]{3,40}$/).required(),
  campaign_name: Joi.string().trim().min(2).max(120).required(),
  discount_type: Joi.string().valid("percent", "fixed").required(),
  discount_value: amount.required(), max_discount: amount.allow(null),
  min_subtotal: Joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
  starts_at: Joi.date().iso().required(), ends_at: Joi.date().iso().greater(Joi.ref("starts_at")).required(),
  max_total_uses: Joi.number().integer().min(1).allow(null),
  max_uses_per_user: Joi.number().integer().min(1).allow(null),
  listing_id: uuid.allow(null), host_id: uuid.allow(null),
  city: Joi.string().trim().max(120).allow("", null),
  audience: Joi.string().valid("all", "new_guest", "returning_guest").default("all"),
  notify_users: Joi.boolean().default(false),
}).custom((value, helpers) => {
  const invalidPercent = value.discount_type === "percent" && value.discount_value > 99;
  const invalidNewGuestLimit = value.audience === "new_guest" &&
    value.max_uses_per_user != null && value.max_uses_per_user !== 1;
  return invalidPercent || invalidNewGuestLimit ? helpers.error("any.invalid") : value;
});
const applyCoupon = Joi.object({ code: Joi.string().trim().pattern(/^[A-Za-z0-9_-]{3,40}$/).required() });
const couponActive = Joi.object({ is_active: Joi.boolean().required() });

module.exports = { createCoupon, applyCoupon, couponActive };
