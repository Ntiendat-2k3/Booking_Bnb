const bcrypt = require("bcrypt");
const { User, UserSetting, PaymentMethod, RefreshToken, sequelize } = require("../models");
const { sanitizeUser } = require("./auth.service");
const { invalidateListings } = require("../core/cache");
const httpError = require("../utils/httpError");

function toPlain(v) {
  return v?.toJSON ? v.toJSON() : v;
}

async function ensureSettingRow(userId) {
  const [row] = await UserSetting.findOrCreate({
    where: { user_id: userId },
    defaults: {
      user_id: userId,
      show_profile: true,
      show_reviews: true,
      marketing_emails: false,
      updated_at: new Date(),
    },
  });
  return row;
}

module.exports = {
  async getMe(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }
    return sanitizeUser(user);
  },

  async updateProfile(userId, { full_name, username, phone, about, location }) {
    const user = await User.findByPk(userId);
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    if (username && username !== user.username) {
      const existing = await User.findOne({ where: { username } });
      if (existing) throw httpError(409, "Username already exists");
      user.username = username;
    }
    user.full_name = full_name;
    user.phone = phone || null;
    user.about = about || null;
    user.location = location || null;

    try {
      await user.save();
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") throw httpError(409, "Username already exists");
      throw error;
    }
    await invalidateListings();
    return sanitizeUser(user);
  },

  async setAvatarUrl(userId, avatar_url) {
    const user = await User.findByPk(userId);
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }
    user.avatar_url = avatar_url || null;
    await user.save();
    await invalidateListings();
    return sanitizeUser(user);
  },

  async changePassword(userId, { current_password, new_password }) {
    return sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) throw httpError(404, "User not found");
      if (user.provider !== "local" || !user.password_hash) throw httpError(400, "Password change is only available for local accounts");
      if (!await bcrypt.compare(current_password, user.password_hash)) throw httpError(400, "Current password is incorrect");
      await user.update({ password_hash: await bcrypt.hash(new_password, 10), reset_password_token: null, reset_password_expires: null }, { transaction });
      await RefreshToken.update({ revoked_at: new Date() }, { where: { user_id: userId, revoked_at: null }, transaction });
      return true;
    });
  },

  async getSettings(userId) {
    const row = await ensureSettingRow(userId);
    return toPlain(row);
  },

  async updateSettings(userId, patch) {
    const row = await ensureSettingRow(userId);

    Object.assign(row, patch);
    row.updated_at = new Date();
    await row.save();
    await invalidateListings();
    return toPlain(row);
  },

  async listPaymentMethods(userId) {
    const rows = await PaymentMethod.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
    });
    return rows.map(toPlain);
  },

  async createPaymentMethod(userId, body) {
    return sequelize.transaction(async (transaction) => {
      if (!await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE })) throw httpError(404, "User not found");
      const count = await PaymentMethod.count({ where: { user_id: userId }, transaction });
      const is_default = count === 0 || body.is_default === true;
      if (is_default) await PaymentMethod.update({ is_default: false }, { where: { user_id: userId }, transaction });
      const row = await PaymentMethod.create({ user_id: userId, provider: body.provider, type: body.type, label: body.label, is_default, meta: body.meta || null }, { transaction });
      return toPlain(row);
    });
  },

  async setDefaultPaymentMethod(userId, id) {
    return sequelize.transaction(async (transaction) => {
      if (!await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE })) throw httpError(404, "User not found");
      const row = await PaymentMethod.findOne({ where: { id, user_id: userId }, transaction });
      if (!row) throw httpError(404, "Payment method not found");
      await PaymentMethod.update({ is_default: false }, { where: { user_id: userId }, transaction });
      await row.update({ is_default: true }, { transaction });
      return toPlain(row);
    });
  },

  async deletePaymentMethod(userId, id) {
    return sequelize.transaction(async (transaction) => {
      if (!await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE })) throw httpError(404, "User not found");
      const row = await PaymentMethod.findOne({ where: { id, user_id: userId }, transaction });
      if (!row) throw httpError(404, "Payment method not found");
      const wasDefault = row.is_default;
      await row.destroy({ transaction });
      if (wasDefault) {
        const next = await PaymentMethod.findOne({ where: { user_id: userId }, order: [["created_at", "DESC"], ["id", "DESC"]], transaction });
        if (next) await next.update({ is_default: true }, { transaction });
      }
      return true;
    });
  },
};
