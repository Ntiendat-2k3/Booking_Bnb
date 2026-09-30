const { errorResponse } = require("../utils/response");

module.exports = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  let status = error.status || error.statusCode || 500;
  if (error.name === "SequelizeUniqueConstraintError") status = 409;
  else if (["SequelizeValidationError", "SequelizeForeignKeyConstraintError"].includes(error.name)) status = 400;
  if (!Number.isInteger(status) || status < 400 || status > 599) status = 500;
  if (status >= 500) console.error("[api] Lỗi xử lý request:", req.method, req.path, error.name);
  const message = status >= 500 ? "Internal server error"
    : error.name?.startsWith("Sequelize") ? "Invalid or conflicting data" : error.message || "Request failed";
  return errorResponse(res, message, status);
};
