const rateLimit = require("express-rate-limit");

// Login brute-force protection
const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many login attempts, please try again later." },
});

const authRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many register attempts, please try again later." },
});

const authRefreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many requests, please slow down." },
});

module.exports = { authLoginLimiter, authRegisterLimiter, authRefreshLimiter };
