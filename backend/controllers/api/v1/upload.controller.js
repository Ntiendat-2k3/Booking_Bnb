const { successResponse, errorResponse } = require("../../../utils/response");
const { uploadBuffer } = require("../../../services/cloudinary.service");

function safeFolderPart(v) {
  return String(v || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .slice(0, 80);
}

module.exports = {
  // POST /api/v1/uploads/listing-image  (multipart: image)
  uploadListingImage: async (req, res) => {
    try {
      if (!req.file) return errorResponse(res, "File is required", 400);

      const userId = req.user?.user?.id;
      const listingId = req.query.listing_id ? safeFolderPart(req.query.listing_id) : null;

      const folder = listingId
        ? `booking_bnb/listings/${listingId}`
        : `booking_bnb/users/${safeFolderPart(userId)}`;

      const result = await uploadBuffer(req.file.buffer, { folder });

      return successResponse(
        res,
        {
          url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          format: result.format,
          resource_type: result.resource_type,
        },
        "Uploaded",
        201
      );
    } catch (e) {
      // avoid leaking SDK details
      return errorResponse(res, "Upload failed", 500);
    }
  },
};
