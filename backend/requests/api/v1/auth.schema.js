const Joi = require("joi");

const email = Joi.string().trim().email().max(255).required();
const username = Joi.string().trim().lowercase().pattern(/^[a-z0-9_]{3,40}$/);
const password = Joi.string().min(6).max(72).custom((value, helpers) => Buffer.byteLength(value, "utf8") <= 72 ? value : helpers.error("string.max", { limit: 72 }));
const registerSchema = Joi.object({ email, username, password: password.required(), full_name: Joi.string().trim().min(2).max(100).required() });
// Giữ tên field email cho client cũ; khi đăng nhập, giá trị cũng có thể là username.
const loginSchema = Joi.object({ email: Joi.string().trim().max(255).required(), password: Joi.string().max(1024).required() });
const googleLinkSchema = loginSchema;
const forgotPasswordSchema = Joi.object({ email });
const resetPasswordSchema = Joi.object({ token: Joi.string().hex().length(64).required(), newPassword: password.required() });

module.exports = { registerSchema, loginSchema, googleLinkSchema, forgotPasswordSchema, resetPasswordSchema, password };
