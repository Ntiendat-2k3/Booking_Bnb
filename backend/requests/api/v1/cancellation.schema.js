const Joi = require("joi");

module.exports = {
  cancelBookingSchema: Joi.object({
    expected_refund_amount: Joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER),
    reason: Joi.string().trim().max(500).allow(""),
  }),
  adminRefundQuery: Joi.object({
    status: Joi.string().valid("all", "requested", "processing", "succeeded", "failed", "manual_review").default("all"),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
  adminRefundAction: Joi.object({
    action: Joi.string().valid("retry", "review").required(),
    note: Joi.string().trim().min(3).max(1000).required(),
  }),
  adminDisputeQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
  adminDisputeNote: Joi.object({
    note: Joi.string().trim().min(3).max(1000).required(),
  }),
};
