module.exports = {
  successResponse: (res, data, message = "Success", statusCode = 200, meta) => {
    return res.status(statusCode).json({
      status: "success",
      message,
      data,
      ...(meta ? { meta } : {}),
    });
  },
  errorResponse: (res, message = "Error", statusCode = 500, errors = {}) => {
    return res.status(statusCode).json({
      status: "error",
      message,
      errors,
    });
  },
};
