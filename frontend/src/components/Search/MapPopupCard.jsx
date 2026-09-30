import Link from "next/link";
import Image from "next/image";
import { Star, X } from "@phosphor-icons/react";
import { formatVND } from "@/lib/format";
import { useLocale } from "@/i18n/LocaleProvider";

export default function MapPopupCard({ listing, onClose }) {
  const { locale, t } = useLocale();

  if (!listing) return null;

  const id = listing?.id || listing?.listing_id || listing?.uuid;
  const cover = listing?.cover_url || listing?.images?.[0]?.url;
  const rating = Number(listing?.avg_rating || 0);
  const ratingText = rating > 0 ? rating.toFixed(1) : t("common.new");
  const distanceKm =
    listing?.distance_km != null ? Number(listing?.distance_km) : null;
  const distanceText = Number.isFinite(distanceKm)
    ? `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`
    : null;

  return (
    <div className="absolute bottom-3 left-3 z-10 w-[min(320px,calc(100%-1.5rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-float">
      <div className="relative">
        {cover ? (
          <div className="relative h-40 w-full">
            <Image
              src={cover}
              alt={listing?.title || t("listing.fallbackTitle")}
              fill
              sizes="320px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="h-40 w-full bg-muted-surface" />
        )}

        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full bg-surface/95 text-ink shadow-sm transition hover:bg-surface"
          aria-label={t("common.close")}
        >
          <X aria-hidden size={18} weight="bold" />
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-ink">
              {listing?.title || t("listing.fallbackTitle")}
            </div>
            <div className="mt-1 text-sm text-muted-ink">
              {listing?.city || ""}
              {distanceText ? (
                <span className="ml-2">
                  · {t("listing.distance", { distance: distanceText })}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 text-sm text-ink">
            <Star aria-hidden size={16} weight="fill" />
            <span className="font-medium">{ratingText}</span>
            {Number(listing?.review_count || 0) > 0 ? (
              <span className="text-muted-ink">
                ({Number(listing.review_count)})
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-end justify-between mt-3">
          <div className="text-base font-semibold">
            {formatVND(
              listing?.price_per_night,
              locale === "en" ? "en-US" : "vi-VN",
            )}
          </div>
          {id ? (
            <Link
              href={`/rooms/${id}`}
              className="rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-on-ink transition hover:bg-ink/85"
            >
              {t("common.viewDetails")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
