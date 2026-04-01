import { apiFetch } from "@/lib/api";

export async function getReviews(listingId, page = 1, limit = 6) {
  return await apiFetch(`/api/v1/listings/${listingId}/reviews?page=${page}&limit=${limit}`);
}

export async function getMyReview(listingId) {
  return await apiFetch(`/api/v1/listings/${listingId}/reviews/mine`);
}

export async function createReview(listingId, rating, comment) {
  return await apiFetch(`/api/v1/listings/${listingId}/reviews`, {
    method: "POST",
    body: { rating: Number(rating), comment },
  });
}

export async function updateReview(reviewId, rating, comment) {
  return await apiFetch(`/api/v1/reviews/${reviewId}`, {
    method: "PATCH",
    body: { rating: Number(rating), comment },
  });
}

export async function deleteReview(reviewId) {
  return await apiFetch(`/api/v1/reviews/${reviewId}`, {
    method: "DELETE",
  });
}
