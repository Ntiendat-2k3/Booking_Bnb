const Joi = require("joi");

const listQuerySchema = Joi.object({
  q: Joi.string().trim().max(255).allow(""),
  page: Joi.number().integer().min(1).max(100000).default(1), limit: Joi.number().integer().min(1).max(500).default(200),
});

const bookingQuerySchema = listQuerySchema.keys({ status: Joi.string().valid("all", "pending_payment", "confirmed", "cancelled", "completed") });
const paymentQuerySchema = listQuerySchema.keys({ status: Joi.string().valid("all", "pending", "succeeded", "failed", "cancelled", "refunded"), provider: Joi.string().valid("all", "stripe", "vnpay") });
const reviewQuerySchema = listQuerySchema.keys({ visibility: Joi.string().valid("all", "visible", "hidden"), rating: Joi.string().valid("all", "1", "2", "3", "4", "5") });
const userQuerySchema = listQuerySchema.keys({ limit: Joi.number().integer().min(1).max(500).default(500) });
const listingQuerySchema = listQuerySchema.keys({ status: Joi.string().valid("all", "pending", "published", "paused", "draft", "rejected"), limit: Joi.number().integer().min(1).max(500).default(300) });
const amenityQuerySchema = listQuerySchema.keys({ active: Joi.string().valid("all", "active", "inactive"), group: Joi.string().trim().max(120).allow("all", ""), limit: Joi.number().integer().min(1).max(1000).default(1000) });

module.exports = { bookingQuerySchema, paymentQuerySchema, reviewQuerySchema, userQuerySchema, listingQuerySchema, amenityQuerySchema };
