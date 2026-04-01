const { errorResponse } = require("../../utils/response");

/**
 * Generic Joi validation middleware
 * @param {import("joi").Schema} schema
 * @param {string} source - 'body', 'query', or 'params'
 */
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      errors: {
        wrap: {
          label: "",
        },
      },
    });

    if (error) {
      const errors = {};
      error.details.forEach((detail) => {
        errors[detail.context.key] = detail.message;
      });
      return errorResponse(res, "Validation failed", 400, errors);
    }

    // Replace request data with validated/sanitized value
    req[source] = value;
    next();
  };
};

module.exports = validate;
