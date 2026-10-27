const { BookingProposal, BookingProposalEvent, Booking, ChatConversation, ChatMessage, Listing, User,
  ListingImage, sequelize, Sequelize } = require("../models");
const chatRepo = require("../repositories/chat.repository");
const chatService = require("./chat.service");
const bookingService = require("./booking.service");
const httpError = require("../utils/httpError");
const chatMessageView = require("../utils/chatMessageView");
const { isUuid } = require("../utils/validators");
const { Op } = Sequelize;

const PENDING = "PENDING_CUSTOMER_CONFIRMATION";
const CHANGES = "CUSTOMER_REQUESTED_CHANGES";
const REJECTED = "REJECTED";
const RECONFIRM = "NEEDS_RECONFIRMATION";
const CREATED = "BOOKING_CREATED";

function requireHostRole(role) {
  if (!["host", "admin", "super_admin"].includes(role)) throw httpError(403, "Forbidden");
}

function publicView(proposal, bookingStatus = null) {
  const data = proposal.toJSON();
  return {
    id: data.id, conversation_id: data.conversation_id, message_id: data.message_id,
    listing_id: data.listing_id, created_by: data.created_by,
    customer_id: data.customer_id, status: data.status, version: data.version,
    check_in: data.check_in, check_out: data.check_out, guests_count: data.guests_count,
    renter_name: data.renter_name, renter_phone: data.renter_phone,
    special_requests: data.special_requests, change_request: data.change_request,
    listing: data.listing_snapshot, price_per_night: String(data.price_per_night_snapshot),
    total_amount: String(data.total_amount_snapshot), currency: data.currency,
    failure_reason: data.failure_reason, confirmed_by: data.confirmed_by,
    confirmed_at: data.confirmed_at, booking_id: data.created_booking_id,
    booking_status: bookingStatus, created_at: data.created_at, updated_at: data.updated_at,
  };
}

async function viewWithBooking(proposal) {
  const booking = proposal.created_booking_id ? await Booking.findByPk(proposal.created_booking_id,
    { attributes: ["status"] }) : null;
  return publicView(proposal, booking?.status || null);
}

function cardContext(proposal) {
  const view = publicView(proposal);
  return { proposal_id: view.id, status: view.status, version: view.version,
    listing: view.listing, check_in: view.check_in, check_out: view.check_out,
    guests_count: view.guests_count, price_per_night: view.price_per_night,
    total_amount: view.total_amount, currency: view.currency,
    booking_id: view.booking_id };
}

async function quoteForHost({ actorId, role, conversationId, input }, transaction) {
  requireHostRole(role);
  const customerId = await chatRepo.assertActivePair(conversationId, actorId, transaction);
  const managed = await Listing.findOne({ where: { id: input.listing_id, deleted_at: null },
    attributes: ["id", "host_id"], transaction });
  if (!managed) throw httpError(404, "Listing not found");
  if (String(managed.host_id) !== String(actorId)) throw httpError(403, "Listing not owned");
  const { listing, nights, guests, total } = await bookingService.quote({
    listingId: input.listing_id, check_in: input.check_in,
    check_out: input.check_out, guests_count: input.guests_count,
  }, transaction);
  if (String(listing.host_id) !== String(actorId)) throw httpError(403, "Listing not owned");
  const cover = await ListingImage.findOne({ where: { listing_id: listing.id },
    attributes: ["url"], order: [["is_cover", "DESC"], ["sort_order", "ASC"]], transaction });
  return { customerId, listing: {
    id: listing.id, title: listing.title,
    location: [listing.city, listing.country].filter(Boolean).join(", "),
    image_url: cover?.url || null, max_guests: listing.max_guests,
  }, check_in: input.check_in, check_out: input.check_out, guests_count: guests,
  nights, price_per_night: String(listing.price_per_night), total_amount: total, currency: "VND" };
}

async function recordEvent(proposal, actorId, event, transaction) {
  await BookingProposalEvent.create({ proposal_id: proposal.id, actor_id: actorId,
    event, version: proposal.version, metadata: {} }, { transaction });
}

async function updateCard(proposal, transaction) {
  const message = await ChatMessage.findOne({ where: {
    id: proposal.message_id, conversation_id: proposal.conversation_id, type: "booking_proposal",
  }, transaction, lock: transaction.LOCK.UPDATE });
  if (!message || message.context?.proposal_id !== proposal.id)
    throw httpError(409, "Proposal message missing");
  await message.update({ context: cardContext(proposal), revision: message.revision + 1 },
    { transaction });
  return message;
}

async function publish(conversationId, message, event) {
  try { await chatService.publishMessage(conversationId, message, event); }
  catch (error) { console.error("[booking-proposal] Không gửi được sự kiện chat:", error.name); }
}

async function lockedProposal(conversationId, proposalId, actorId, transaction) {
  await chatRepo.assertActivePair(conversationId, actorId, transaction);
  const proposal = await BookingProposal.findOne({ where: { id: proposalId,
    conversation_id: conversationId }, transaction, lock: transaction.LOCK.UPDATE });
  if (!proposal || ![proposal.created_by, proposal.customer_id].includes(actorId))
    throw httpError(404, "Proposal not found");
  return proposal;
}

module.exports = {
  /** Chỉ lấy ID phòng từ thẻ listing, sau đó đối chiếu quyền và trạng thái với dữ liệu hiện tại. */
  async candidates(actorId, role, conversationId, search = "") {
    requireHostRole(role);
    await sequelize.transaction((transaction) =>
      chatRepo.assertActivePair(conversationId, actorId, transaction));
    const messages = await ChatMessage.findAll({ where: {
      conversation_id: conversationId, type: "shared_context", recalled_at: null,
    }, attributes: ["context"], order: [["sequence", "DESC"]] });
    const referenceIds = [...new Set(messages.map((message) => message.context)
      .filter((context) => context?.type === "listing" && isUuid(context.id))
      .map((context) => context.id.toLowerCase()))];
    const owned = { host_id: actorId, deleted_at: null };
    const sharedRows = referenceIds.length ? await Listing.findAll({ where: {
      ...owned, id: { [Op.in]: referenceIds },
    }, attributes: ["id", "title", "city", "country", "status", "max_guests"] }) : [];
    const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    const otherRows = await Listing.findAll({ where: {
      ...owned, status: "published",
      ...(referenceIds.length ? { id: { [Op.notIn]: referenceIds } } : {}),
      ...(search ? { [Op.or]: [{ title: { [Op.iLike]: pattern } },
        { city: { [Op.iLike]: pattern } }, { country: { [Op.iLike]: pattern } }] } : {}),
    }, attributes: ["id", "title", "city", "country", "status", "max_guests"],
    order: [["created_at", "DESC"]], limit: 31 });
    const allRows = [...sharedRows, ...otherRows];
    const images = allRows.length ? await ListingImage.findAll({ where: {
      listing_id: { [Op.in]: allRows.map((row) => row.id) },
    }, attributes: ["listing_id", "url"], order: [["is_cover", "DESC"], ["sort_order", "ASC"]] }) : [];
    const coverById = new Map();
    for (const image of images) if (!coverById.has(image.listing_id)) coverById.set(image.listing_id, image.url);
    const view = (row) => ({ id: row.id, title: row.title,
      location: [row.city, row.country].filter(Boolean).join(", "),
      image_url: coverById.get(row.id) || null, status: row.status, max_guests: row.max_guests });
    const sharedById = new Map(sharedRows.map((row) => [row.id, row]));
    return { shared: referenceIds.map((id) => sharedById.get(id)).filter(Boolean).map(view),
      other: otherRows.slice(0, 30).map(view), hasMore: otherRows.length > 30 };
  },

  /** Báo giá để chủ nhà xem lại; chưa giữ phòng và không tạo booking. */
  quote(actorId, role, conversationId, input) {
    return sequelize.transaction((transaction) => quoteForHost(
      { actorId, role, conversationId, input }, transaction));
  },

  async detail(actorId, conversationId, proposalId) {
    if (!await chatRepo.member(conversationId, actorId)) throw httpError(404, "Conversation not found");
    const proposal = await BookingProposal.findOne({ where: { id: proposalId,
      conversation_id: conversationId } });
    if (!proposal || ![proposal.created_by, proposal.customer_id].includes(actorId))
      throw httpError(404, "Proposal not found");
    return viewWithBooking(proposal);
  },

  /** Proposal và message được ghi cùng transaction; client_key giữ thao tác gửi không bị lặp. */
  async create(actorId, role, conversationId, input) {
    const result = await sequelize.transaction(async (transaction) => {
      requireHostRole(role);
      const customerId = await chatRepo.assertActivePair(conversationId, actorId, transaction);
      await ChatConversation.findByPk(conversationId, { transaction,
        lock: transaction.LOCK.UPDATE });
      const existing = await BookingProposal.findOne({ where: {
        created_by: actorId, client_key: input.client_key }, transaction });
      if (existing) {
        if (existing.conversation_id !== conversationId || existing.listing_id !== input.listing_id ||
          existing.check_in !== input.check_in || existing.check_out !== input.check_out ||
          Number(existing.guests_count) !== Number(input.guests_count) ||
          (existing.renter_name || "") !== input.renter_name ||
          (existing.renter_phone || "") !== input.renter_phone ||
          (existing.special_requests || "") !== (input.special_requests || ""))
          throw httpError(409, "Proposal key conflict");
        return { proposal: existing, message: null, created: false };
      }
      const quote = await quoteForHost({ actorId, role, conversationId, input }, transaction);
      if (quote.customerId !== customerId) throw httpError(409, "Conversation changed");
      const proposal = await BookingProposal.create({
        conversation_id: conversationId, listing_id: input.listing_id,
        created_by: actorId, customer_id: customerId, client_key: input.client_key,
        status: PENDING, version: 1, check_in: input.check_in, check_out: input.check_out,
        guests_count: quote.guests_count, renter_name: input.renter_name,
        renter_phone: input.renter_phone, special_requests: input.special_requests || null,
        listing_snapshot: quote.listing, price_per_night_snapshot: quote.price_per_night,
        total_amount_snapshot: quote.total_amount, currency: "VND",
      }, { transaction });
      const sent = await chatRepo.createMessage({ conversationId, senderId: actorId,
        type: "booking_proposal", body: `Đề xuất đặt phòng: ${quote.listing.title}`,
        context: cardContext(proposal), clientKey: `proposal:${input.client_key}`, transaction });
      if (!sent.created) throw httpError(409, "Proposal key conflict");
      await proposal.update({ message_id: sent.message.id }, { transaction });
      await recordEvent(proposal, actorId, "CREATED", transaction);
      return { proposal, message: sent.message, created: true };
    });
    if (result.created) await publish(conversationId, result.message, "chat:message");
    return { proposal: await viewWithBooking(result.proposal),
      message: result.message ? chatMessageView(result.message.toJSON()) : null };
  },

  /** Mỗi lần chủ nhà sửa đều tăng version và vô hiệu hóa xác nhận của bản trước. */
  async update(actorId, role, conversationId, proposalId, input) {
    const result = await sequelize.transaction(async (transaction) => {
      requireHostRole(role);
      const proposal = await lockedProposal(conversationId, proposalId, actorId, transaction);
      if (proposal.created_by !== actorId) throw httpError(403, "Forbidden");
      if (proposal.version !== input.version) throw httpError(409, "PROPOSAL_VERSION_CHANGED");
      if (![PENDING, CHANGES, RECONFIRM].includes(proposal.status))
        throw httpError(409, "Proposal cannot be edited");
      const quote = await quoteForHost({ actorId, role, conversationId, input }, transaction);
      if (quote.customerId !== proposal.customer_id) throw httpError(409, "Conversation changed");
      await proposal.update({ listing_id: input.listing_id, check_in: input.check_in,
        check_out: input.check_out, guests_count: quote.guests_count,
        renter_name: input.renter_name, renter_phone: input.renter_phone,
        special_requests: input.special_requests || null, listing_snapshot: quote.listing,
        price_per_night_snapshot: quote.price_per_night, total_amount_snapshot: quote.total_amount,
        status: PENDING, version: proposal.version + 1, change_request: null,
        failure_reason: null, confirmed_by: null, confirmed_at: null }, { transaction });
      await recordEvent(proposal, actorId, "UPDATED", transaction);
      return { proposal, message: await updateCard(proposal, transaction) };
    });
    await publish(conversationId, result.message, "chat:message:update");
    return { proposal: await viewWithBooking(result.proposal), message: result.message.toJSON() };
  },

  /** Chỉ khách của cuộc trò chuyện được xác nhận; booking vẫn chờ thanh toán theo flow hiện có. */
  async act(actorId, conversationId, proposalId, action, input) {
    const result = await sequelize.transaction(async (transaction) => {
      const proposal = await lockedProposal(conversationId, proposalId, actorId, transaction);
      if (proposal.customer_id !== actorId) throw httpError(403, "Forbidden");
      if (proposal.version !== input.version) throw httpError(409, "PROPOSAL_VERSION_CHANGED");
      if (action === "confirm" && proposal.status === CREATED && proposal.confirmed_by === actorId)
        return { proposal, message: null };
      if (proposal.status !== PENDING) throw httpError(409, "Proposal is no longer pending");
      if (action === "request-changes") {
        await proposal.update({ status: CHANGES, change_request: input.note }, { transaction });
        await recordEvent(proposal, actorId, "CHANGES_REQUESTED", transaction);
      } else if (action === "reject") {
        await proposal.update({ status: REJECTED, change_request: input.note || null }, { transaction });
        await recordEvent(proposal, actorId, "REJECTED", transaction);
      } else if (action === "confirm") {
        const creator = await User.findByPk(proposal.created_by,
          { attributes: ["role"], transaction });
        const listing = await Listing.findOne({ where: { id: proposal.listing_id,
          deleted_at: null, status: "published" }, transaction, lock: transaction.LOCK.UPDATE });
        if (!creator || !["host", "admin", "super_admin"].includes(creator.role) ||
          !listing || String(listing.host_id) !== String(proposal.created_by)) {
          await proposal.update({ status: RECONFIRM, failure_reason: "LISTING_CHANGED" }, { transaction });
        } else {
          try {
            const { booking } = await bookingService.create({ userId: actorId,
              listingId: proposal.listing_id, check_in: proposal.check_in,
              check_out: proposal.check_out, guests_count: proposal.guests_count,
              expectedPricePerNight: proposal.price_per_night_snapshot,
              expectedTotal: proposal.total_amount_snapshot, transaction });
            await proposal.update({ status: CREATED, created_booking_id: booking.id,
              confirmed_by: actorId, confirmed_at: new Date(), failure_reason: null }, { transaction });
          } catch (error) {
            if (![400, 404, 409].includes(error.status)) throw error;
            await proposal.update({ status: RECONFIRM,
              failure_reason: error.message === "PRICE_CHANGED" ? "PRICE_CHANGED" :
                error.message === "Dates are not available" ? "UNAVAILABLE" : "LISTING_CHANGED" },
            { transaction });
          }
        }
        await recordEvent(proposal, actorId,
          proposal.status === CREATED ? "BOOKING_CREATED" : "NEEDS_RECONFIRMATION", transaction);
      } else throw httpError(400, "Invalid proposal action");
      return { proposal, message: await updateCard(proposal, transaction) };
    });
    if (result.message) await publish(conversationId, result.message, "chat:message:update");
    return { proposal: await viewWithBooking(result.proposal),
      message: result.message?.toJSON() || null };
  },
};
