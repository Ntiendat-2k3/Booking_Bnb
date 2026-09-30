"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, MapPin, Star } from "@phosphor-icons/react";
import clsx from "clsx";
import { formatVND } from "@/lib/format";
import { useLocale } from "@/i18n/LocaleProvider";
import FavoriteButton from "@/components/FavoriteButton";

export default function ListingCard({ listing, priority = false, checkIn, checkOut, featured = false }) {
  const id = listing?.id || listing?.listing_id || listing?.uuid || null;
  const dates = new URLSearchParams({ ...(checkIn ? { check_in: checkIn } : {}), ...(checkOut ? { check_out: checkOut } : {}) });
  const roomHref = id ? `/rooms/${id}${dates.size ? `?${dates}` : ""}` : "#";
  const { locale, t } = useLocale();

  const cover = listing.cover_url || listing.images?.[0]?.url;
  const coverSrc = cover || "/placeholder-room.svg";
  const rating = Number(listing.avg_rating || 0);
  const ratingText = rating > 0 ? rating.toFixed(1) : t("common.new");
  const distanceKm = listing.distance_km != null ? Number(listing.distance_km) : null;
  const distanceText = Number.isFinite(distanceKm) ? `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km` : null;

  return (
    <article className="discovery-card listing-card group flex h-full flex-col">
      <div className={clsx("listing-card-cover relative aspect-[4/3] w-full overflow-hidden rounded-control bg-muted-surface", featured && "sm:aspect-[16/9] lg:aspect-auto lg:min-h-80 lg:flex-1")}>
        <Link href={roomHref} className="absolute inset-0">
          <Image
            src={coverSrc}
            alt={listing?.title || t("listing.fallbackTitle")}
            fill
            sizes={featured ? "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 680px" : "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 420px"}
            className="object-cover transition duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
            priority={priority}
          />
        </Link>

        <FavoriteButton listingId={id} className="card-favorite absolute right-3 top-3 z-10 shadow-sm" />
      </div>

      <Link href={roomHref} className={clsx("listing-card-content flex flex-1 flex-col px-3 pb-3 pt-4", featured && "lg:flex-none")}>
        <div className="listing-card-meta mb-3 flex items-center justify-between gap-3">
          <p className="listing-card-location truncate text-sm text-muted-ink">
            <MapPin aria-hidden size={16} className="mr-1 hidden shrink-0" />
            {listing?.city || ""}{listing?.country ? `, ${listing.country}` : ""}
          </p>
          <span className="listing-card-rating inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
            <Star aria-hidden size={16} weight="fill" className="text-brand" />{ratingText}
            {Number(listing.review_count) > 0 && <span className="hidden font-normal">({listing.review_count})</span>}
          </span>
        </div>
        <h3 className={clsx("listing-card-title line-clamp-2 min-h-12 text-lg font-bold leading-6 tracking-tight text-ink", featured && "lg:min-h-0 lg:text-3xl lg:leading-tight")}>
          {listing?.title || t("listing.fallbackTitle")}
        </h3>

        {distanceText ? <p className="mt-2 text-sm text-muted-ink">{t("listing.distance", { distance: distanceText })}</p> : null}
        <div className="listing-card-price mt-auto pt-4">
          <div className="flex items-center justify-between gap-2 border-t border-line/70 pt-3">
            <div className="text-sm text-ink">
              <span className="block text-lg font-bold tracking-tight">
                {formatVND(
                  listing?.price_per_night || listing?.price || 0,
                  locale === "en" ? "en-US" : "vi-VN",
                )}
              </span>
              <span className="text-xs text-muted-ink">{t("listing.perNight")}</span>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-muted-surface text-ink transition group-hover:bg-ink group-hover:text-on-ink">
              <ArrowUpRight aria-hidden size={20} />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
