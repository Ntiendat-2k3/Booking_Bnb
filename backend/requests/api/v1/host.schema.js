const Joi = require("joi");
const { uuid } = require("./common.schema");

const contactSchema = Joi.object({ email: Joi.string().trim().email().max(255).required(), phone: Joi.string().max(30).allow(null, ""), content: Joi.string().trim().min(1).max(5000).required() });
const imageParams = Joi.object({ id: uuid.required(), imageId: uuid.required() });
const uploadQuerySchema = Joi.object({ listing_id: uuid.required() });

module.exports = { contactSchema, imageParams, uploadQuerySchema };
