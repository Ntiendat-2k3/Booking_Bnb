import Image from "next/image";
import { Star, X } from "@phosphor-icons/react";
import { formatVND } from "@/lib/format";
import { useLocale } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";

export default function MapPopupCard({ listing, onClose }) {
  const { locale, t } = useLocale();

  if (!listing) return null;

  const id = listing?.id || listing?.listing_id || listing?.uuid;
  const cover = listing?.cover_url || listing?.images?.[0]?.url;
  const rating = Number(listing?.avg_rating || 0);
  const distanceKm =
    listing?.distance_km != null ? Number(listing?.distance_km) : null;
  const distanceText = Number.isFinite(distanceKm)
    ? `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`
    : null;

  return (
    <div className="surface-panel absolute bottom-3 left-3 z-10 max-h-[min(70%,420px)] w-[min(340px,calc(100%-1.5rem))] overflow-y-auto shadow-float motion-safe:animate-[fadeIn_0.35s_ease-out_both]">
      <div className="relative">
        {cover ? (
          <div className="relative h-24 w-full sm:h-36">
            <Image
              src={cover}
              alt={listing?.title || t("listing.fallbackTitle")}
              fill
              sizes="340px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="h-24 w-full bg-muted-surface sm:h-36" />
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

      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="line-clamp-2 text-base font-semibold text-ink">
              {listing?.title || t("listing.fallbackTitle")}
            </div>
            <div className="mt-1 line-clamp-2 text-sm text-muted-ink">
              {listing?.address || [listing?.city, listing?.country].filter(Boolean).join(", ")}
              {distanceText ? (
                <span className="ml-2">
                  · {t("listing.distance", { distance: distanceText })}
                </span>
              ) : null}
            </div>
          </div>

          {rating > 0 ? (
            <div className="flex shrink-0 items-center gap-1 text-sm text-ink">
              <Star aria-hidden size={16} weight="fill" className="text-brand" />
              <span className="font-medium">{rating.toFixed(1)}</span>
              {Number(listing?.review_count || 0) > 0 ? <span className="text-muted-ink">({Number(listing.review_count)})</span> : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-end justify-between mt-3">
          <div className="text-base font-semibold text-ink">
            {formatVND(listing?.price_per_night || listing?.price || 0, locale === "en" ? "en-US" : "vi-VN")}
            <span className="block text-xs font-normal text-muted-ink">{t("listing.perNight")}</span>
          </div>
          {id ? (
            <Button href={`/rooms/${id}`} variant="ink" size="sm" className="!px-3">
              {t("common.viewDetails")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
