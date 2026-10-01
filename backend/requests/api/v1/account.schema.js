const Joi = require("joi");
const { password } = require("./auth.schema");

const updateProfileSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(100).required(),
  username: Joi.string().trim().lowercase().pattern(/^[a-z0-9_]{3,40}$/),
  phone: Joi.string()
    .trim()
    .pattern(/^[0-9+ ]{8,15}$/)
    .allow(null, "")
    .messages({
      "string.pattern.base": "Số điện thoại không hợp lệ (8-15 chữ số)",
    }),
  about: Joi.string().trim().max(1000).allow(null, ""),
  location: Joi.string().trim().max(255).allow(null, ""),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: password.required().messages({
    "string.min": "Mật khẩu mới phải có ít nhất 6 ký tự",
  }),
});

const updateSettingsSchema = Joi.object({
  show_profile: Joi.boolean(),
  show_reviews: Joi.boolean(),
  marketing_emails: Joi.boolean(),
}).min(1);

const paymentMethodSchema = Joi.object({
  provider: Joi.string().valid("stripe", "bank", "momo", "vnpay").required(),
  type: Joi.string().valid("card", "ewallet", "bank_transfer").required(),
  label: Joi.string().trim().min(1).max(255).required(),
  is_default: Joi.boolean().default(false),
  meta: Joi.object().max(20).allow(null),
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  updateSettingsSchema,
  paymentMethodSchema,
};
