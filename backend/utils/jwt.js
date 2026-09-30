const jwt = require("jsonwebtoken");
const crypto = require("crypto");

function accessSecret() {
  return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
}
function refreshSecret() {
  return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
}

module.exports = {
  //: tạo access token
  createAccessToken: (data = {}) => {
    const secret = accessSecret();
    const expires = process.env.JWT_ACCESS_TOKEN_EXPIRES || "15m";
    const payload = {
      userId: data.id,
      email: data.email,
      role: data.role,
      provider: data.provider,
    };
    return jwt.sign(payload, secret, { expiresIn: expires });
  },

  //: tạo refresh token (zip-style: random signed jwt, userId nằm ở DB record)
  createRefreshToken: () => {
    const secret = refreshSecret();
    const expires = process.env.JWT_REFRESH_TOKEN_EXPIRES || "30d";
    const data = crypto.randomBytes(32).toString("hex");
    return jwt.sign({ data, type: "refresh" }, secret, { expiresIn: expires });
  },

  //: giải mã token --> trả về payload

  decodeToken: (token, type = "access") => {
    const secret = type === "refresh" ? refreshSecret() : accessSecret();
    let decoded;
    try { decoded = jwt.verify(token, secret); }
    catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError || error instanceof jwt.NotBeforeError) {
        throw Object.assign(new Error("Invalid or expired token"), { status: 401 });
      }
      throw error;
    }
    if (type === "refresh" && decoded.type !== "refresh") {
      throw Object.assign(new Error("Invalid refresh token"), { status: 401 });
    }
    return decoded;
  },
};
