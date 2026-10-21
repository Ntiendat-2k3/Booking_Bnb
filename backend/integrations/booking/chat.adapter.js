const { Listing, ListingImage, User } = require("../../models");
const chat = require("../../services/chat.service");
const httpError = require("../../utils/httpError");

/** Xác thực phòng và chia sẻ thông tin phòng trong hội thoại trực tiếp với chủ nhà. */
module.exports = {
  async contactHost(userId, listingId, clientKey) {
    const listing = await Listing.findOne({
      where: { id: listingId, status: "published" },
      attributes: ["id", "host_id", "title", "city", "country"],
      include: [{ model: User, as: "host", where: { status: "active" }, attributes: ["id"] }],
    });
    if (!listing) throw httpError(404, "Listing not available");
    if (listing.host_id === userId) throw httpError(400, "Cannot contact yourself");
    const conversation = await chat.createDirect(userId, listing.host_id);
    const cover = await ListingImage.findOne({ where: { listing_id: listing.id },
      attributes: ["url"], order: [["is_cover", "DESC"], ["sort_order", "ASC"]] });
    await chat.shareListing(userId, conversation.id, {
      type: "listing", id: listing.id, title: listing.title,
      location: [listing.city, listing.country].filter(Boolean).join(", "),
      image_url: cover?.url || null,
    }, clientKey);
    return chat.detail(userId, conversation.id);
  },
};
