const Joi = require("joi");

const email = Joi.string().trim().email().max(255).required();
const password = Joi.string().min(6).max(72).custom((value, helpers) => Buffer.byteLength(value, "utf8") <= 72 ? value : helpers.error("string.max", { limit: 72 }));
const registerSchema = Joi.object({ email, password: password.required(), full_name: Joi.string().trim().min(2).max(100).required() });
const loginSchema = Joi.object({ email, password: Joi.string().max(1024).required() });
const forgotPasswordSchema = Joi.object({ email });
const resetPasswordSchema = Joi.object({ token: Joi.string().hex().length(64).required(), newPassword: password.required() });

module.exports = { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, password };
