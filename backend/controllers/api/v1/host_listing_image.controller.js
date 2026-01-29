const { successResponse, errorResponse } = require("../../../utils/response");
const { Listing, ListingImage } = require("../../../models");
const { Op } = require("sequelize");
const { destroy } = require("../../../services/cloudinary.service");

function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function canEditListing(role, status) {
  if (role === "admin") return true;
  // Host can edit draft/rejected/paused only
  return ["draft", "rejected", "paused"].includes(status);
}

async function ensureOwnerOrAdmin(req, listing) {
  const role = req.user?.user?.role;
  const userId = req.user?.user?.id;
  if (role === "admin") return true;
  return listing.host_id === userId;
}

async function getNextSortOrder(listingId) {
  const max = await ListingImage.max("sort_order", { where: { listing_id: listingId } });
  const n = Number.isFinite(Number(max)) ? Number(max) : -1;
  return n + 1;
}

async function ensureCoverExists(listingId) {
  const cover = await ListingImage.findOne({ where: { listing_id: listingId, is_cover: true } });
  if (cover) return;
  const first = await ListingImage.findOne({ where: { listing_id: listingId }, order: [["sort_order", "ASC"], ["created_at", "ASC"]] });
  if (first) await first.update({ is_cover: true }).catch(() => {});
}

module.exports = {
  // POST /api/v1/host/listings/:id/images
  attach: async (req, res) => {
    try {
      const listingId = req.params.id;
      if (!isUuid(listingId)) return errorResponse(res, "Invalid listing id", 400);

      const listing = await Listing.findByPk(listingId);
      if (!listing) return errorResponse(res, "Listing not found", 404);
      if (!(await ensureOwnerOrAdmin(req, listing))) return errorResponse(res, "Forbidden", 403);

      const role = req.user?.user?.role;
      if (!canEditListing(role, listing.status)) return errorResponse(res, "Listing is not editable in this status", 400);

      const { url, public_id, width, height, bytes, format, resource_type, is_cover, sort_order } = req.body || {};
      if (!url) return errorResponse(res, "url is required", 400);

      const existingCount = await ListingImage.count({ where: { listing_id: listingId } });
      const nextSort = await getNextSortOrder(listingId);

      const sort = Number.isFinite(Number(sort_order)) ? Number(sort_order) : nextSort;

      // First image should be cover by default
      const shouldCover = Boolean(is_cover) || existingCount === 0;

      const img = await ListingImage.create({
        listing_id: listingId,
        url,
        public_id: public_id || null,
        width: width || null,
        height: height || null,
        bytes: bytes || null,
        format: format || null,
        resource_type: resource_type || "image",
        is_cover: shouldCover,
        sort_order: sort,
        created_at: new Date(),
      });

      // If cover, unset other cover flags
      if (shouldCover) {
        await ListingImage.update(
          { is_cover: false },
          { where: { listing_id: listingId, id: { [Op.ne]: img.id } } }
        ).catch(() => {});
      } else {
        await ensureCoverExists(listingId);
      }

      return successResponse(res, { image: img }, "Attached", 201);
    } catch (e) {
      return errorResponse(res, e.message || "Attach failed", e.status || 500);
    }
  },

  // PATCH /api/v1/host/listings/:id/images/:imageId/cover
  setCover: async (req, res) => {
    try {
      const listingId = req.params.id;
      const imageId = req.params.imageId;
      if (!isUuid(listingId) || !isUuid(imageId)) return errorResponse(res, "Invalid id", 400);

      const listing = await Listing.findByPk(listingId);
      if (!listing) return errorResponse(res, "Listing not found", 404);
      if (!(await ensureOwnerOrAdmin(req, listing))) return errorResponse(res, "Forbidden", 403);

      const role = req.user?.user?.role;
      if (!canEditListing(role, listing.status)) return errorResponse(res, "Listing is not editable in this status", 400);

      const img = await ListingImage.findOne({ where: { id: imageId, listing_id: listingId } });
      if (!img) return errorResponse(res, "Image not found", 404);

      await ListingImage.update({ is_cover: false }, { where: { listing_id: listingId } }).catch(() => {});
      await img.update({ is_cover: true });

      return successResponse(res, { image: img }, "Cover updated", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Cover update failed", e.status || 500);
    }
  },

  // DELETE /api/v1/host/listings/:id/images/:imageId
  remove: async (req, res) => {
    try {
      const listingId = req.params.id;
      const imageId = req.params.imageId;
      if (!isUuid(listingId) || !isUuid(imageId)) return errorResponse(res, "Invalid id", 400);

      const listing = await Listing.findByPk(listingId);
      if (!listing) return errorResponse(res, "Listing not found", 404);
      if (!(await ensureOwnerOrAdmin(req, listing))) return errorResponse(res, "Forbidden", 403);

      const role = req.user?.user?.role;
      if (!canEditListing(role, listing.status)) return errorResponse(res, "Listing is not editable in this status", 400);

      const img = await ListingImage.findOne({ where: { id: imageId, listing_id: listingId } });
      if (!img) return errorResponse(res, "Image not found", 404);

      const wasCover = Boolean(img.is_cover);
      const publicId = img.public_id;
      const rtype = img.resource_type || "image";

      await img.destroy();

      if (publicId) {
        await destroy(publicId, rtype).catch(() => {});
      }

      if (wasCover) {
        await ensureCoverExists(listingId);
      }

      return successResponse(res, { ok: true }, "Deleted", 200);
    } catch (e) {
      return errorResponse(res, e.message || "Delete failed", e.status || 500);
    }
  },
};
