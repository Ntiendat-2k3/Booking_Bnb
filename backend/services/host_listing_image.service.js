const { ListingImage, UploadedAsset, sequelize } = require("../models");
const hostListingService = require("./host_listing.service");
const { uploadFile } = require("./cloudinary.service");
const { registerUpload, completeUpload, findForAttach, enqueueDeletion } = require("./uploaded_asset.service");
const { enqueue } = require("./background_job.service");
const { randomUUID } = require("node:crypto");
const { promises: fs } = require("node:fs");
const httpError = require("../utils/httpError");

const MAX_LISTING_IMAGES = 20;

async function lockEditableListing(user, listingId, transaction) {
  const { listing } = await hostListingService.getByIdForUser(user, listingId, {
    transaction, lock: transaction.LOCK.UPDATE, include: [],
  });
  hostListingService.assertEditable(user, listing);
  return listing;
}

async function ensureCoverExists(listingId, transaction) {
  if (await ListingImage.findOne({ where: { listing_id: listingId, is_cover: true }, transaction })) return;
  const first = await ListingImage.findOne({ where: { listing_id: listingId }, order: [["sort_order", "ASC"], ["created_at", "ASC"]], transaction });
  if (first) await first.update({ is_cover: true }, { transaction });
}

module.exports = {
  async upload(user, file, listingId) {
    if (!file) throw httpError(400, "File is required");
    let asset;
    try {
      const imageId = randomUUID();
      const folder = `booking_bnb/listings/${listingId}`;
      asset = await sequelize.transaction(async (transaction) => {
        await lockEditableListing(user, listingId, transaction);
        const attached = await ListingImage.count({ where: { listing_id: listingId }, transaction });
        const pending = await UploadedAsset.count({ where: { listing_id: listingId, attached_at: null, delete_requested: false }, transaction });
        if (attached + pending >= MAX_LISTING_IMAGES) throw httpError(400, `Maximum ${MAX_LISTING_IMAGES} images per listing`);
        return registerUpload(user.id, `${folder}/${imageId}`, listingId, transaction);
      });
      const result = await uploadFile(file, asset.public_id);
      if (result.public_id !== asset.public_id) throw new Error("Cloudinary public ID mismatch");
      asset = await completeUpload(asset, result);
      return { public_id: asset.public_id, ...asset.metadata };
    } catch (error) {
      if (asset) {
        try {
          await sequelize.transaction(async (transaction) => {
            await asset.update({ delete_requested: true }, { transaction });
            await enqueue("cloudinary_delete", { public_id: asset.public_id, resource_type: "image" }, transaction);
          });
        } catch (cleanupError) {
          console.error("[uploads] Không thể lên lịch xóa ảnh lỗi:", cleanupError.name);
        }
      }
      throw error;
    } finally {
      await fs.unlink(file.path).catch((error) => {
        if (error.code !== "ENOENT") console.error("[uploads] Không thể xóa tệp tạm:", error.name);
      });
    }
  },

  async attach(user, listingId, body) {
    return sequelize.transaction(async (transaction) => {
      await lockEditableListing(user, listingId, transaction);
      const asset = await findForAttach(user, listingId, body.public_id, transaction);
      if (await ListingImage.findOne({ where: { public_id: asset.public_id }, transaction })) throw httpError(409, "Image is already attached");
      const count = await ListingImage.count({ where: { listing_id: listingId }, transaction });
      if (count >= MAX_LISTING_IMAGES) throw httpError(400, `Maximum ${MAX_LISTING_IMAGES} images per listing`);
      const max = await ListingImage.max("sort_order", { where: { listing_id: listingId }, transaction });
      const cover = body.is_cover === true || count === 0;
      if (cover) await ListingImage.update({ is_cover: false }, { where: { listing_id: listingId }, transaction });
      const image = await ListingImage.create({
        listing_id: listingId, public_id: asset.public_id, ...asset.metadata,
        sort_order: body.sort_order ?? (max == null ? 0 : Number(max) + 1), is_cover: cover, created_at: new Date(),
      }, { transaction });
      await asset.update({ listing_id: listingId, attached_at: new Date() }, { transaction });
      await ensureCoverExists(listingId, transaction);
      return { image };
    });
  },

  async setCover(user, listingId, imageId) {
    return sequelize.transaction(async (transaction) => {
      await lockEditableListing(user, listingId, transaction);
      const image = await ListingImage.findOne({ where: { id: imageId, listing_id: listingId }, transaction });
      if (!image) throw httpError(404, "Image not found");
      await ListingImage.update({ is_cover: false }, { where: { listing_id: listingId }, transaction });
      await image.update({ is_cover: true }, { transaction });
      return { image };
    });
  },

  async remove(user, listingId, imageId) {
    return sequelize.transaction(async (transaction) => {
      const listing = await lockEditableListing(user, listingId, transaction);
      const image = await ListingImage.findOne({ where: { id: imageId, listing_id: listingId }, transaction });
      if (!image) throw httpError(404, "Image not found");
      await enqueueDeletion(image, listing, transaction);
      await image.destroy({ transaction });
      await ensureCoverExists(listingId, transaction);
      return { ok: true };
    });
  },
};
