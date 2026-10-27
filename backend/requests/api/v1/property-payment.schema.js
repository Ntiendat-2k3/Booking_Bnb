const Joi = require("joi");
const { uuid } = require("./common.schema");

module.exports = {
  collect: Joi.object({ listing_id: uuid.required(), method: Joi.string().valid("cash", "bank_transfer").required(),
    amount: Joi.string().pattern(/^[1-9]\d*$/).required() }),
  report: Joi.object({ listing_id: uuid.required(), page: Joi.number().integer().min(1).max(100000).default(1) }),
  noShow: Joi.object({ listing_id: uuid.required(), reason: Joi.string().trim().min(3).max(500).required() }),
};
