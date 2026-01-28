const { successResponse, errorResponse } = require("../../../utils/response");
const { Listing, ListingImage } = require("../../../models");
const { Op } = require("sequelize");
const { destroy } = require("../../../services/cloudinary.service");

function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function ensureOwnerOrAdmin(req, listing) {
  const role = req.user?.user?.role;
  const userId = req.user?.user?.id;
  if (role === "admin") return true;
  return listing.host_id === userId;
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

      const { url, public_id, width, height, bytes, format, resource_type, is_cover, sort_order } = req.body || {};
      if (!url) return errorResponse(res, "url is required", 400);

      const img = await ListingImage.create({
        listing_id: listingId,
        url,
        public_id: public_id || null,
        width: width || null,
        height: height || null,
        bytes: bytes || null,
        format: format || null,
        resource_type: resource_type || "image",
        is_cover: Boolean(is_cover),
        sort_order: Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0,
        created_at: new Date(),
      });

      // if is_cover, unset other cover flags
      if (Boolean(is_cover)) {
        await ListingImage.update(
          { is_cover: false },
          { where: { listing_id: listingId, id: { [Op.ne]: img.id } } }
        ).catch(() => {});
      }

      return successResponse(res, { image: img }, "Attached", 201);
    } catch (e) {
      return errorResponse(res, "Attach failed", 500);
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

      const img = await ListingImage.findOne({ where: { id: imageId, listing_id: listingId } });
      if (!img) return errorResponse(res, "Image not found", 404);

      await img.destroy();

      if (img.public_id) {
        await destroy(img.public_id, img.resource_type || "image").catch(() => {});
      }

      return successResponse(res, { ok: true }, "Deleted");
    } catch (e) {
      return errorResponse(res, "Delete failed", 500);
    }
  },
};
