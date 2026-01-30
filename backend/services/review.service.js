const { Op } = require("sequelize");
const { Review, Booking, User, UserSetting, Sequelize } = require("../models");

function todayDateOnlyUtc() {
  // DATEONLY columns are stored as YYYY-MM-DD. Compare in UTC to avoid timezone surprises.
  return new Date().toISOString().slice(0, 10);
}

function toPlain(v) {
  return v?.toJSON ? v.toJSON() : v;
}

function applyPrivacyOnReview(row) {
  const rv = toPlain(row);
  const reviewer = rv.reviewer ? toPlain(rv.reviewer) : null;
  const setting = reviewer?.setting ? toPlain(reviewer.setting) : null;

  // If setting missing: default to show.
  const showReviews = setting?.show_reviews !== false;
  if (!showReviews) return null;

  const showProfile = setting?.show_profile !== false;
  if (!showProfile && reviewer) {
    reviewer.id = null;
    reviewer.full_name = "Người dùng ẩn danh";
    reviewer.avatar_url = null;
  }

  // remove internal nested settings from payload
  if (reviewer) delete reviewer.setting;
  rv.reviewer = reviewer;
  return rv;
}

async function getUserReviewableBooking({ userId, listingId }) {
  const today = todayDateOnlyUtc();

  // Review rules:
  // - If user has checked out via our "Checkout" button -> booking.status becomes "completed" and can review immediately.
  // - If booking still "confirmed", only allow review after the stay ends (check_out <= today).
  // - Booking must not already have a review.
  const booking = await Booking.findOne({
    where: {
      guest_id: userId,
      listing_id: listingId,
      [Op.or]: [
        { status: "completed" },
        { status: "confirmed", check_out: { [Op.lte]: today } },
      ],
    },
    include: [
      {
        association: "review",
        required: false,
        attributes: ["id"],
      },
    ],
    order: [["check_out", "DESC"]],
  });

  if (!booking) return { booking: null, canReview: false };
  if (booking.review) return { booking, canReview: false };
  return { booking, canReview: true };
}


module.exports = {
  async listPublicByListing({ listingId, page = 1, limit = 10 }) {
    const p = Math.max(1, Number(page || 1));
    const l = Math.min(50, Math.max(1, Number(limit || 10)));
    const offset = (p - 1) * l;

    const { rows, count } = await Review.findAndCountAll({
      where: {
        listing_id: listingId,
        is_hidden: false,
        [Op.and]: Sequelize.literal('COALESCE("reviewer->setting"."show_reviews", TRUE) = TRUE'),
      },
      include: [
        {
          model: User,
          as: "reviewer",
          attributes: ["id", "full_name", "avatar_url"],
          include: [
            {
              model: UserSetting,
              as: "setting",
              attributes: ["show_profile", "show_reviews"],
              required: false,
            },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: l,
      offset,
      distinct: true,
    });

    const items = rows
      .map(applyPrivacyOnReview)
      .filter(Boolean);

    return {
      items,
      meta: {
        page: p,
        limit: l,
        total: count,
        total_pages: Math.ceil(count / l),
      },
    };
  },

  async mineForListing({ userId, listingId }) {
    // If already reviewed (any booking for this listing), return it; else tell FE if can_review.
    const existing = await Review.findOne({
      where: { listing_id: listingId, reviewer_id: userId },
      order: [["created_at", "DESC"]],
    });

    if (existing) {
      return { review: toPlain(existing), can_review: false };
    }

    const { canReview } = await getUserReviewableBooking({ userId, listingId });
    return { review: null, can_review: canReview };
  },

  async createForListing({ userId, listingId, rating, comment }) {
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      const err = new Error("rating must be an integer 1..5");
      err.status = 400;
      throw err;
    }

    const { booking, canReview } = await getUserReviewableBooking({ userId, listingId });
    if (!canReview || !booking) {
      const err = new Error("You cannot review this listing yet");
      err.status = 400;
      throw err;
    }

    const created = await Review.create({
      booking_id: booking.id,
      listing_id: listingId,
      reviewer_id: userId,
      rating: r,
      comment: comment || null,
      created_at: new Date(),
    });

    return toPlain(created);
  },

  async update({ userId, reviewId, rating, comment }) {
    const review = await Review.findByPk(reviewId);
    if (!review) {
      const err = new Error("Review not found");
      err.status = 404;
      throw err;
    }
    if (String(review.reviewer_id) !== String(userId)) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }

    if (rating !== undefined) {
      const r = Number(rating);
      if (!Number.isInteger(r) || r < 1 || r > 5) {
        const err = new Error("rating must be an integer 1..5");
        err.status = 400;
        throw err;
      }
      review.rating = r;
    }
    if (comment !== undefined) {
      review.comment = comment || null;
    }

    await review.save();
    return toPlain(review);
  },

  async remove({ userId, reviewId }) {
    const review = await Review.findByPk(reviewId);
    if (!review) {
      const err = new Error("Review not found");
      err.status = 404;
      throw err;
    }
    if (String(review.reviewer_id) !== String(userId)) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    await review.destroy();
    return true;
  },
};
