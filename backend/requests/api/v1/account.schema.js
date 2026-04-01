const Joi = require("joi");

const updateProfileSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(100).required(),
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
  new_password: Joi.string().min(6).required().messages({
    "string.min": "Mật khẩu mới phải có ít nhất 6 ký tự",
  }),
});

const updateSettingsSchema = Joi.object({
  show_profile: Joi.boolean(),
  show_reviews: Joi.boolean(),
  marketing_emails: Joi.boolean(),
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  updateSettingsSchema,
};
