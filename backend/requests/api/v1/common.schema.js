const Joi = require("joi");

const uuid = Joi.string().guid({ version: ["uuidv1", "uuidv2", "uuidv3", "uuidv4", "uuidv5"] });
const dateOnly = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value, helpers) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : helpers.error("any.invalid");
});
const pagination = Joi.object({ page: Joi.number().integer().min(1).max(100000), limit: Joi.number().integer().min(1).max(100) });
const idParams = Joi.object({ id: uuid.required() });

module.exports = { uuid, dateOnly, pagination, idParams };
