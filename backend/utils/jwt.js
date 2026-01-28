const jwt = require("jsonwebtoken");

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
    const data = Math.random().toString(36).substring(2) + new Date().getTime();
    return jwt.sign({ data, type: "refresh" }, secret, { expiresIn: expires });
  },

  //: giải mã token --> trả về payload
  // type: "access" | "refresh"
  decodeToken: (token, type = "access") => {
    const secret = type === "refresh" ? refreshSecret() : accessSecret();
    const decoded = jwt.verify(token, secret);
    if (type === "refresh" && decoded.type !== "refresh") {
      throw new Error("Invalid refresh token");
    }
    return decoded;
  },
};
