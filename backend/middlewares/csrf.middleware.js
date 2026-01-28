const { errorResponse } = require("../utils/response");
const { csrfCookieName } = require("../utils/cookies");

module.exports = (req, res, next) => {
  const cookieToken = req.cookies?.[csrfCookieName()];
  const headerToken = req.get("X-CSRF-Token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return errorResponse(res, "CSRF token invalid", 403);
  }

  return next();
};
