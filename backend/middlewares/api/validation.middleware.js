const { errorResponse } = require("../../utils/response");

/**
 * Chuẩn hóa dữ liệu tại ranh giới HTTP và trả lỗi từng trường trước khi gọi nghiệp vụ.
 * @param {import("joi").Schema} schema
 * @param {string} source Vị trí dữ liệu: body, query hoặc params.
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

    // Chỉ truyền dữ liệu đã được kiểm tra tới tầng nghiệp vụ.
    req[source] = value;
    next();
  };
};

module.exports = validate;
