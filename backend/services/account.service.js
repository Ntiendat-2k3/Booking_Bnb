const bcrypt = require("bcrypt");
const { User, UserSetting, PaymentMethod } = require("../models");

function toPlain(v) {
  return v?.toJSON ? v.toJSON() : v;
}

async function ensureSettingRow(userId) {
  let row = await UserSetting.findByPk(userId);
  if (!row) {
    row = await UserSetting.create({
      user_id: userId,
      show_profile: true,
      show_reviews: true,
      marketing_emails: false,
      updated_at: new Date(),
    });
  }
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
    const plain = toPlain(user);
    delete plain.password_hash;
    return plain;
  },

  async updateProfile(userId, { full_name, phone }) {
    const user = await User.findByPk(userId);
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    if (full_name !== undefined) {
      const name = String(full_name || "").trim();
      if (!name) {
        const err = new Error("full_name is required");
        err.status = 400;
        throw err;
      }
      user.full_name = name;
    }

    if (phone !== undefined) {
      const p = String(phone || "").trim();
      user.phone = p || null;
    }

    await user.save();
    const plain = toPlain(user);
    delete plain.password_hash;
    return plain;
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
    const plain = toPlain(user);
    delete plain.password_hash;
    return plain;
  },

  async changePassword(userId, { current_password, new_password }) {
    const user = await User.findByPk(userId);
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }
    if (user.provider !== "local" || !user.password_hash) {
      const err = new Error("Password change is only available for local accounts");
      err.status = 400;
      throw err;
    }
    if (!current_password || !new_password) {
      const err = new Error("current_password and new_password are required");
      err.status = 400;
      throw err;
    }
    if (String(new_password).length < 6) {
      const err = new Error("new_password must be at least 6 characters");
      err.status = 400;
      throw err;
    }

    const ok = await bcrypt.compare(String(current_password), String(user.password_hash));
    if (!ok) {
      const err = new Error("Current password is incorrect");
      err.status = 400;
      throw err;
    }

    user.password_hash = await bcrypt.hash(String(new_password), 10);
    await user.save();
    return true;
  },

  async getSettings(userId) {
    const row = await ensureSettingRow(userId);
    return toPlain(row);
  },

  async updateSettings(userId, patch) {
    const row = await ensureSettingRow(userId);

    if (patch.show_profile !== undefined) row.show_profile = !!patch.show_profile;
    if (patch.show_reviews !== undefined) row.show_reviews = !!patch.show_reviews;
    if (patch.marketing_emails !== undefined) row.marketing_emails = !!patch.marketing_emails;
    row.updated_at = new Date();
    await row.save();
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
    const provider = String(body?.provider || "").trim();
    const type = String(body?.type || "").trim();
    const label = String(body?.label || "").trim();
    const isDefaultRequested = body?.is_default === true;

    if (!provider || !type || !label) {
      const err = new Error("provider, type, label are required");
      err.status = 400;
      throw err;
    }

    const existing = await PaymentMethod.count({ where: { user_id: userId } });
    const is_default = existing === 0 || isDefaultRequested;

    if (is_default) {
      await PaymentMethod.update(
        { is_default: false },
        { where: { user_id: userId } },
      );
    }

    const row = await PaymentMethod.create({
      user_id: userId,
      provider,
      type,
      label,
      is_default,
      meta: body?.meta || null,
    });
    return toPlain(row);
  },

  async setDefaultPaymentMethod(userId, id) {
    const row = await PaymentMethod.findOne({ where: { id, user_id: userId } });
    if (!row) {
      const err = new Error("Payment method not found");
      err.status = 404;
      throw err;
    }
    await PaymentMethod.update(
      { is_default: false },
      { where: { user_id: userId } },
    );
    row.is_default = true;
    await row.save();
    return toPlain(row);
  },

  async deletePaymentMethod(userId, id) {
    const row = await PaymentMethod.findOne({ where: { id, user_id: userId } });
    if (!row) {
      const err = new Error("Payment method not found");
      err.status = 404;
      throw err;
    }
    const wasDefault = row.is_default;
    await row.destroy();

    if (wasDefault) {
      const next = await PaymentMethod.findOne({
        where: { user_id: userId },
        order: [["created_at", "DESC"]],
      });
      if (next) {
        next.is_default = true;
        await next.save();
      }
    }
    return true;
  },
};
