function parseExpiryToMs(expStr, fallbackMs) {
  if (!expStr) return fallbackMs;
  const m = String(expStr).trim().match(/^([0-9]+)\s*([smhd])$/i);
  if (!m) return fallbackMs;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const mult = unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return n * mult;
}

function isCookieSecure() {
  const isProd = process.env.NODE_ENV === "production";
  const cookieSecure = String(process.env.COOKIE_SECURE || "").length
    ? String(process.env.COOKIE_SECURE).toLowerCase() === "true"
    : isProd;
  return cookieSecure;
}

function sameSiteValue() {
  return (process.env.COOKIE_SAMESITE || "lax").toLowerCase(); // lax|strict|none
}

function refreshCookieName() {
  return process.env.COOKIE_REFRESH_NAME || "refresh_token";
}

function accessCookieName() {
  return process.env.COOKIE_ACCESS_NAME || "access_token";
}

function csrfCookieName() {
  return process.env.COOKIE_CSRF_NAME || "csrf_token";
}

function refreshCookieOptions() {
  const exp = process.env.JWT_REFRESH_TOKEN_EXPIRES || "30d";
  const maxAge = parseExpiryToMs(exp, 30 * 86_400_000);

  return {
    httpOnly: true,
    secure: isCookieSecure(),
    sameSite: sameSiteValue(),
    path: "/api/v1/auth",
    maxAge,
  };
}

function accessCookieOptions() {
  // access token cookie should be short-lived; default to 15m
  const exp = process.env.JWT_ACCESS_TOKEN_EXPIRES || "15m";
  const maxAge = parseExpiryToMs(exp, 15 * 60_000);

  return {
    httpOnly: true,
    secure: isCookieSecure(),
    sameSite: sameSiteValue(),
    path: "/",
    maxAge,
  };
}

function csrfCookieOptions() {
  // double submit: not httpOnly so FE can read + send header
  const exp = process.env.CSRF_TOKEN_EXPIRES || "12h";
  const maxAge = parseExpiryToMs(exp, 12 * 3_600_000);

  return {
    httpOnly: false,
    secure: isCookieSecure(),
    sameSite: sameSiteValue(),
    path: "/",
    maxAge,
  };
}

module.exports = {
  refreshCookieName,
  accessCookieName,
  csrfCookieName,
  refreshCookieOptions,
  accessCookieOptions,
  csrfCookieOptions,
};
