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
  const { t } = useLocale();
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
            ← {t("aiSearch.standardSearch")}
          </Link>
        ) : null}
        {compact ? (
          <h2 className="text-xl font-bold text-ink">
            {t("aiSearch.askTitle")}
          </h2>
        ) : (
          <h1 className="page-heading">
            {t("aiSearch.title")}
          </h1>
        )}
        {!compact ? (
          <p className="max-w-2xl text-muted-ink">
            {t("aiSearch.description")}
          </p>
        ) : null}
      </div>

      <section
        aria-label={t("aiSearch.conversation")}
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
          aria-label={t("aiSearch.recommended")}
          className="space-y-5"
        >
          <div>
            <h2 className="text-2xl font-bold text-ink">
              {t("aiSearch.suggested")}
            </h2>
            {!result.criteria.check_in ? (
              <p className="mt-1 text-sm text-muted-ink">
                {t("aiSearch.addDates")}
              </p>
            ) : null}
            {result.unverified_near_center ? (
              <p className="mt-1 text-sm text-muted-ink">
                {t("aiSearch.unverifiedDistance")}
              </p>
            ) : null}
            {result.unmatched_amenities.length ? (
              <p className="mt-1 text-sm text-muted-ink">
                {t("aiSearch.unmatchedAmenities", { amenities: result.unmatched_amenities.join(", ") })}
              </p>
            ) : null}
            {result.limited_to_first ? (
              <p className="mt-1 text-sm text-muted-ink">
                {t("aiSearch.limitedResults")}
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
                    {t("aiSearch.why")}
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {listing.reasons.map((reason, index) => (
                      <li
                        key={index}
                        className="px-3 py-1 text-xs rounded-full bg-muted-surface text-muted-ink"
                      >
                        {t(`aiSearch.reasons.${["city", "guests", "amenity", "distance"].includes(reason.type) ? reason.type : "rating"}`, { value: reason.value })}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 rounded-control bg-muted-surface text-muted-ink">
              <MagnifyingGlass aria-hidden className="mb-2" size={24} />
              {t("aiSearch.empty")}
            </p>
          )}
          {compact && result.items.length > visibleItems.length ? (
            <Link
              href="/ai-search"
              className="inline-flex items-center text-sm font-semibold min-h-11 text-brand hover:underline"
            >
              {t("aiSearch.seeAll", { count: result.items.length })}
            </Link>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
