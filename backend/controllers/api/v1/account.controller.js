const accountService = require("../../../services/account.service");
const { uploadBuffer } = require("../../../services/cloudinary.service");
const { successResponse, errorResponse } = require("../../../utils/response");

function safeFolderPart(v) {
  return String(v || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .slice(0, 80);
}

module.exports = {
  async me(req, res) {
    try {
      const userId = req.user.user.id;
      const user = await accountService.getMe(userId);
      return successResponse(res, user, "OK", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Internal server error", e.status || 500);
    }
  },

  async updateProfile(req, res) {
    try {
      const userId = req.user.user.id;
      const user = await accountService.updateProfile(userId, req.body || {});
      return successResponse(res, user, "Updated", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Update failed", e.status || 500);
    }
  },

  async changePassword(req, res) {
    try {
      const userId = req.user.user.id;
      await accountService.changePassword(userId, req.body || {});
      return successResponse(res, { ok: true }, "Changed", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Change password failed", e.status || 500);
    }
  },

  async uploadAvatar(req, res) {
    try {
      if (!req.file) return errorResponse(res, "File is required", 400);
      const userId = req.user.user.id;
      const folder = `booking_bnb/avatars/${safeFolderPart(userId)}`;

      const result = await uploadBuffer(req.file.buffer, { folder });
      const user = await accountService.setAvatarUrl(userId, result.secure_url);

      return successResponse(
        res,
        {
          user,
          upload: {
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            format: result.format,
            resource_type: result.resource_type,
          },
        },
        "Uploaded",
        201,
      );
    } catch (e) {
      return errorResponse(res, "Upload failed", 500);
    }
  },

  async getSettings(req, res) {
    try {
      const userId = req.user.user.id;
      const setting = await accountService.getSettings(userId);
      return successResponse(res, setting, "OK", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Fetch settings failed", e.status || 500);
    }
  },

  async updateSettings(req, res) {
    try {
      const userId = req.user.user.id;
      const setting = await accountService.updateSettings(userId, req.body || {});
      return successResponse(res, setting, "Updated", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Update settings failed", e.status || 500);
    }
  },

  async listPaymentMethods(req, res) {
    try {
      const userId = req.user.user.id;
      const items = await accountService.listPaymentMethods(userId);
      return successResponse(res, { items }, "OK", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Fetch payment methods failed", e.status || 500);
    }
  },

  async createPaymentMethod(req, res) {
    try {
      const userId = req.user.user.id;
      const method = await accountService.createPaymentMethod(userId, req.body || {});
      return successResponse(res, method, "Created", 201);
    } catch (e) {
      return errorResponse(res, e.message || "Create payment method failed", e.status || 500);
    }
  },

  async setDefaultPaymentMethod(req, res) {
    try {
      const userId = req.user.user.id;
      const method = await accountService.setDefaultPaymentMethod(userId, req.params.id);
      return successResponse(res, method, "Updated", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Update payment method failed", e.status || 500);
    }
  },

  async deletePaymentMethod(req, res) {
    try {
      const userId = req.user.user.id;
      await accountService.deletePaymentMethod(userId, req.params.id);
      return successResponse(res, { ok: true }, "Deleted", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Delete payment method failed", e.status || 500);
    }
  },
};
