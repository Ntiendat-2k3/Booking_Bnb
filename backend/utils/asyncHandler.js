const { errorResponse } = require("./response");

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((e) => {
    return errorResponse(
      res,
      e.message || "Internal server error",
      e.status || 500
    );
  });
};

module.exports = asyncHandler;
