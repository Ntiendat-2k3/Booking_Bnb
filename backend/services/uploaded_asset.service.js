// Metadata upload được ghi từ kết quả Cloudinary; client chỉ tham chiếu public_id, không quyết định URL hay chủ sở hữu.
const { Op } = require("sequelize");
const { UploadedAsset, sequelize } = require("../models");
const { enqueue } = require("./background_job.service");
const httpError = require("../utils/httpError");

function registerUpload(userId, publicId, listingId, transaction) {
  return UploadedAsset.create({ public_id: publicId, user_id: userId, listing_id: listingId, metadata: {} }, { transaction });
}

async function completeUpload(asset, result) {
  const metadata = {
    url: result.secure_url, width: result.width, height: result.height, bytes: result.bytes,
    format: result.format, resource_type: result.resource_type,
  };
  await UploadedAsset.update({ metadata }, { where: { public_id: asset.public_id } });
  return UploadedAsset.findByPk(asset.public_id);
}

async function findForAttach(user, listingId, publicId, transaction) {
  const asset = await UploadedAsset.findByPk(publicId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!asset || asset.delete_requested || !asset.metadata?.url || (user.role !== "admin" && String(asset.user_id) !== String(user.id))
    || (asset.listing_id && String(asset.listing_id) !== String(listingId))) throw httpError(403, "Upload does not belong to this user and listing");
  return asset;
}

/** Đưa ảnh tải lên quá 24 giờ nhưng chưa gắn vào phòng vào hàng đợi xóa. */
async function cleanupExpiredUploads() {
  const candidates = await UploadedAsset.findAll({
    where: { attached_at: null, delete_requested: false, created_at: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    order: [["created_at", "ASC"]], limit: 100,
  });
  for (const candidate of candidates) {
    await sequelize.transaction(async (transaction) => {
      const asset = await UploadedAsset.findByPk(candidate.public_id, { transaction, lock: transaction.LOCK.UPDATE, skipLocked: true });
      if (!asset || asset.attached_at || asset.delete_requested) return;
      await asset.update({ delete_requested: true }, { transaction });
      await enqueue("cloudinary_delete", { public_id: asset.public_id, resource_type: "image" }, transaction);
    });
  }
}

/** Ảnh cũ chưa có metadata chỉ được xóa khi public_id nằm đúng namespace listing hoặc chủ nhà. */
async function enqueueDeletion(image, listing, transaction) {
  if (!image.public_id) return;
  const asset = await UploadedAsset.findByPk(image.public_id, { transaction });
  const owned = asset ? String(asset.listing_id) === String(listing.id)
    : image.public_id.startsWith(`booking_bnb/listings/${listing.id}/`) || image.public_id.startsWith(`booking_bnb/users/${listing.host_id}/`);
  if (!owned) return;
  if (asset) await asset.update({ delete_requested: true }, { transaction });
  await enqueue("cloudinary_delete", { public_id: image.public_id, resource_type: image.resource_type || "image" }, transaction);
}

module.exports = { registerUpload, completeUpload, findForAttach, enqueueDeletion, cleanupExpiredUploads };
