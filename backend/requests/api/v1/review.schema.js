const Joi = require("joi");

const rating = Joi.number().integer().min(1).max(5);
const comment = Joi.string().max(10000).allow(null, "");
const createReviewSchema = Joi.object({ rating: rating.required(), comment });
const updateReviewSchema = Joi.object({ rating, comment }).min(1);
const reviewQuerySchema = Joi.object({ page: Joi.number().integer().min(1).max(100000).default(1), limit: Joi.number().integer().min(1).max(50).default(10) });

module.exports = { createReviewSchema, updateReviewSchema, reviewQuerySchema };
