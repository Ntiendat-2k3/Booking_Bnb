const asyncHandler = require("../../../utils/asyncHandler");
const accountService = require("../../../services/account.service");
const { uploadFile, destroy } = require("../../../services/cloudinary.service");
const { enqueue } = require("../../../services/background_job.service");
const { promises: fs } = require("node:fs");
const { randomUUID } = require("node:crypto");
const { successResponse, errorResponse } = require("../../../utils/response");
function safeFolderPart(v) {
  return String(v || "").trim().replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80);
}

/** Chỉ nhận ID ảnh đại diện cũ thuộc đúng tài khoản và đúng Cloudinary của ứng dụng. */
function previousAvatarId(url, userId) {
  try {
    const parsed = new URL(url);
    const prefix = `/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`;
    if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com" || !parsed.pathname.startsWith(prefix)) return null;
    const path = parsed.pathname.slice(prefix.length).replace(/^v\d+\//, "");
    const expected = `booking_bnb/avatars/${safeFolderPart(userId)}/`;
    if (!path.startsWith(expected) || !/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(path.slice(expected.length))) return null;
    return path.slice(0, path.lastIndexOf("."));
  } catch {
    return null;
  }
}
module.exports = {
  me: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const user = await accountService.getMe(userId);
    return successResponse(res, user, "OK", 200);
  }),
  updateProfile: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const user = await accountService.updateProfile(userId, req.body || {});
    return successResponse(res, user, "Updated", 200);
  }),
  changePassword: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    await accountService.changePassword(userId, req.body || {});
    return successResponse(res, {
      ok: true
    }, "Changed", 200);
  }),
  uploadAvatar: asyncHandler(async (req, res) => {
    if (!req.file) return errorResponse(res, "File is required", 400);
    const userId = req.user.user.id;
    const folder = `booking_bnb/avatars/${safeFolderPart(userId)}`;
    let result;
    let user;
    try {
      const previous = await accountService.getMe(userId);
      result = await uploadFile(req.file, `${folder}/${randomUUID()}`);
      user = await accountService.setAvatarUrl(userId, result.secure_url);
      const oldId = previousAvatarId(previous.avatar_url, userId);
      if (oldId && oldId !== result.public_id) {
        await enqueue("cloudinary_delete", { public_id: oldId, resource_type: "image" })
          .catch(() => destroy(oldId).catch((error) => console.error("[uploads] Không thể xóa avatar cũ:", error.name)));
      }
    } catch (error) {
      if (result && !user) {
        await enqueue("cloudinary_delete", { public_id: result.public_id, resource_type: "image" })
          .catch(() => destroy(result.public_id).catch((cleanupError) => console.error("[uploads] Không thể xóa avatar lỗi:", cleanupError.name)));
      }
      throw error;
    } finally {
      await fs.unlink(req.file.path).catch((error) => {
        if (error.code !== "ENOENT") console.error("[uploads] Không thể xóa tệp tạm:", error.name);
      });
    }
    return successResponse(res, {
      user,
      upload: {
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        format: result.format,
        resource_type: result.resource_type
      }
    }, "Uploaded", 201);
  }),
  getSettings: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const setting = await accountService.getSettings(userId);
    return successResponse(res, setting, "OK", 200);
  }),
  updateSettings: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const setting = await accountService.updateSettings(userId, req.body || {});
    return successResponse(res, setting, "Updated", 200);
  }),
  listPaymentMethods: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const items = await accountService.listPaymentMethods(userId);
    return successResponse(res, {
      items
    }, "OK", 200);
  }),
  createPaymentMethod: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const method = await accountService.createPaymentMethod(userId, req.body || {});
    return successResponse(res, method, "Created", 201);
  }),
  setDefaultPaymentMethod: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    const method = await accountService.setDefaultPaymentMethod(userId, req.params.id);
    return successResponse(res, method, "Updated", 200);
  }),
  deletePaymentMethod: asyncHandler(async (req, res) => {
    const userId = req.user.user.id;
    await accountService.deletePaymentMethod(userId, req.params.id);
    return successResponse(res, {
      ok: true
    }, "Deleted", 200);
  })
};
