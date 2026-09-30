const Joi = require("joi");

const listQuerySchema = Joi.object({
  q: Joi.string().trim().max(255).allow(""),
  page: Joi.number().integer().min(1).max(100000).default(1), limit: Joi.number().integer().min(1).max(500).default(200),
});

const bookingQuerySchema = listQuerySchema.keys({ status: Joi.string().valid("all", "pending_payment", "confirmed", "cancelled", "completed") });
const paymentQuerySchema = listQuerySchema.keys({ status: Joi.string().valid("all", "pending", "succeeded", "failed", "cancelled", "refunded"), provider: Joi.string().valid("all", "stripe", "vnpay") });
const reviewQuerySchema = listQuerySchema.keys({ visibility: Joi.string().valid("all", "visible", "hidden") });

module.exports = { bookingQuerySchema, paymentQuerySchema, reviewQuerySchema };
