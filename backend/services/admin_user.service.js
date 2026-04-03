const { User } = require("../models");
const { isUuid } = require("../utils/validators");

module.exports = {
  async list() {
    const items = await User.findAll({
      attributes: ["id", "email", "full_name", "role", "status", "created_at"],
      order: [["created_at", "DESC"]],
      limit: 500,
    });
    return { items };
  },

  async setRole(id, role) {
    if (!isUuid(id)) {
      const err = new Error("Invalid user id");
      err.status = 400;
      throw err;
    }
    const allowed = new Set(["guest", "host", "admin"]);
    if (!allowed.has(role)) {
      const err = new Error("Invalid role");
      err.status = 400;
      throw err;
    }

    const user = await User.findByPk(id);
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    await user.update({ role });
    return { user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, status: user.status } };
  },
};
