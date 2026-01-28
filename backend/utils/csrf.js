const crypto = require("crypto");

module.exports = {
  generateCsrfToken: () => crypto.randomBytes(32).toString("hex"),
};
