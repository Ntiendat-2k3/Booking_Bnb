const { User, Sequelize } = require("../models");
const { isUuid } = require("../utils/validators");
const Repository = require("../core/repository");

module.exports = {
  async list({ q = null, page = 1, limit = 500 } = {}) {
    const where = {
      role: { [Sequelize.Op.ne]: "super_admin" },
      ...Repository.searchWhere(q, ["User.id", "User.email", "User.full_name", "User.role"]),
    };
    const [rows, roleCounts] = await Promise.all([
      User.findAll({
      where,
      attributes: ["id", "email", "full_name", "avatar_url", "role", "status", "created_at"],
      order: [["created_at", "DESC"]],
      limit, offset: (page - 1) * limit,
      }),
      User.count({ where, group: ["role"] }),
    ]);
    const roles = { guest: 0, host: 0, admin: 0 };
    for (const row of roleCounts) if (row.role in roles) roles[row.role] = Number(row.count);
    const total = roleCounts.reduce((sum, row) => sum + Number(row.count), 0);
    return { items: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit), roles } };
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

    if (user.role === "super_admin") {
      const err = new Error("Cannot change super admin role");
      err.status = 403;
      throw err;
    }

    if (user.status === "pending_verification") {
      const err = new Error("Email verification required before changing role");
      err.status = 403;
      throw err;
    }

    await user.update({ role });
    return { user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, status: user.status } };
  },
};
