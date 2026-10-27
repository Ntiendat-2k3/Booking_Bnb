"use client";

import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react";
import ListingCard from "@/components/ListingCard";
import { apiFetch } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleProvider";
import { useAiSearch } from "./AiSearchProvider";
import AiSearchConversation from "./AiSearchConversation";
import AiSearchComposer from "./AiSearchComposer";

/** Ghi nguồn kết quả trong phiên để đo click và lượt đặt phòng, không lưu câu hỏi. */
function recordRecommendationClick(event, searchId, listingId) {
  if (!event.target.closest("a[href^='/rooms/']") || !searchId) return;
  try {
    sessionStorage.setItem(
      "booking-bnb-ai-search",
      JSON.stringify({
        search_id: searchId,
        listing_id: listingId,
        saved_at: Date.now(),
      }),
    );
  } catch {
    /* Trình duyệt có thể chặn bộ nhớ phiên. */
  }
  void apiFetch(`/api/v1/ai-search/${searchId}/click`, {
    method: "POST",
    body: { listing_id: listingId },
  }).catch(() => {});
}

export default function AiSearchExperience({ compact = false }) {
  const { locale } = useLocale();
  const english = locale === "en";
  const {
    message,
    setMessage,
    conversation,
    result,
    busy,
    error,
    submit,
    acknowledgeInput,
  } = useAiSearch();

  function reasonLabel(reason) {
    if (reason.type === "city")
      return english ? `In ${reason.value}` : `Ở ${reason.value}`;
    if (reason.type === "guests")
      return english
        ? `Up to ${reason.value} guests`
        : `Tối đa ${reason.value} khách`;
    if (reason.type === "amenity")
      return english ? `Amenity: ${reason.value}` : `Có ${reason.value}`;
    if (reason.type === "distance")
      return english
        ? `About ${reason.value} km from the mapped city center`
        : `Khoảng ${reason.value} km đến tâm địa danh trên bản đồ`;
    return english ? `Rating ${reason.value}` : `Đánh giá ${reason.value}`;
  }

  const visibleItems = compact ? result?.items.slice(0, 4) : result?.items;

  return (
    <div
      className={compact ? "space-y-5" : "mx-auto max-w-6xl space-y-8 pb-16"}
    >
      <div className="space-y-3">
        {!compact ? (
          <Link
            href="/search"
            className="text-sm font-medium text-brand hover:underline"
          >
            ← {english ? "Standard search" : "Tìm kiếm thông thường"}
          </Link>
        ) : null}
        {compact ? (
          <h2 className="text-xl font-bold text-ink">
            {english ? "Ask Ballerina AI" : "Hỏi Ballerina AI"}
          </h2>
        ) : (
          <h1 className="page-heading">
            {english ? "Find a place by chatting" : "Tìm phòng bằng hội thoại"}
          </h1>
        )}
        {!compact ? (
          <p className="max-w-2xl text-muted-ink">
            {english
              ? "Describe where, when and what you need. Prices and availability come from current listings."
              : "Mô tả nơi ở, số khách, ngân sách, tiện nghi và ngày đi. Giá cùng lịch trống được kiểm tra từ dữ liệu phòng."}
          </p>
        ) : null}
      </div>

      <section
        aria-label={english ? "Search conversation" : "Hội thoại tìm phòng"}
        className={
          compact
            ? "space-y-1"
            : "rounded-panel border border-line bg-surface p-4 shadow-sm sm:p-6"
        }
      >
        <AiSearchConversation conversation={conversation} onExample={setMessage} />
        <AiSearchComposer
          compact={compact}
          message={message}
          setMessage={setMessage}
          busy={busy}
          error={error}
          submit={submit}
          acknowledgeInput={acknowledgeInput}
        />
      </section>

      {result ? (
        <section
          aria-label={english ? "Recommended places" : "Phòng đề xuất"}
          className="space-y-5"
        >
          <div>
            <h2 className="text-2xl font-bold text-ink">
              {english ? "Suggested places" : "Phòng phù hợp"}
            </h2>
            {!result.criteria.check_in ? (
              <p className="mt-1 text-sm text-muted-ink">
                {english
                  ? "Add check-in and check-out dates to verify availability and stay prices."
                  : "Thêm ngày nhận và trả phòng để kiểm tra lịch trống và giá kỳ ở."}
              </p>
            ) : null}
            {result.unverified_near_center ? (
              <p className="mt-1 text-sm text-muted-ink">
                {english
                  ? "Some distances to the mapped city center could not be verified."
                  : "Một số khoảng cách đến tâm địa danh trên bản đồ chưa được xác minh; hãy xem vị trí trên trang phòng."}
              </p>
            ) : null}
            {result.unmatched_amenities.length ? (
              <p className="mt-1 text-sm text-muted-ink">
                {english
                  ? "Amenities not found: "
                  : "Không tìm thấy tiện nghi: "}
                {result.unmatched_amenities.join(", ")}
              </p>
            ) : null}
            {result.limited_to_first ? (
              <p className="mt-1 text-sm text-muted-ink">
                {english
                  ? "Suggestions are ranked from an initial set of listings. Refine your request for a narrower search."
                  : "Đề xuất được xếp từ một tập phòng ban đầu. Hãy mô tả cụ thể hơn để thu hẹp kết quả."}
              </p>
            ) : null}
          </div>
          {visibleItems.length ? (
            <div
              className={
                compact
                  ? "grid gap-4"
                  : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              }
            >
              {visibleItems.map((listing) => (
                <div
                  key={listing.id}
                  className="space-y-2"
                  onClickCapture={(event) =>
                    recordRecommendationClick(
                      event,
                      result.search_id,
                      listing.id,
                    )
                  }
                >
                  <ListingCard
                    listing={listing}
                    checkIn={result.criteria.check_in}
                    checkOut={result.criteria.check_out}
                  />
                  <p className="text-sm font-semibold text-ink">
                    {english ? "Why this place" : "Vì sao phù hợp"}
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {listing.reasons.map((reason, index) => (
                      <li
                        key={index}
                        className="px-3 py-1 text-xs rounded-full bg-muted-surface text-muted-ink"
                      >
                        {reasonLabel(reason)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 rounded-control bg-muted-surface text-muted-ink">
              <MagnifyingGlass aria-hidden className="mb-2" size={24} />
              {english
                ? "No matching places. Try changing your city, budget or amenities."
                : "Chưa có phòng phù hợp. Hãy thử đổi thành phố, ngân sách hoặc tiện nghi."}
            </p>
          )}
          {compact && result.items.length > visibleItems.length ? (
            <Link
              href="/ai-search"
              className="inline-flex items-center text-sm font-semibold min-h-11 text-brand hover:underline"
            >
              {english
                ? `See all ${result.items.length} places`
                : `Xem tất cả ${result.items.length} phòng`}
            </Link>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
