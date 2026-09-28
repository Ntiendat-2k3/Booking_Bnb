"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Star } from "@phosphor-icons/react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "@/store/favoritesThunks";
import { formatVND } from "@/lib/format";
import { notifyError, notifySuccess } from "@/lib/notify";
import { selectAuthUser, selectFavoriteIdsSet } from "@/store/selectors";
import { useLocale } from "@/i18n/LocaleProvider";

export default function ListingCard({ listing, priority = false }) {
  const id = listing?.id || listing?.listing_id || listing?.uuid || null;
  const router = useRouter();
  const dispatch = useDispatch();
  const { locale, t } = useLocale();

  const user = useSelector(selectAuthUser);
  const isInitialized = useSelector((s) => s.auth.isInitialized);
  const favoriteIdsSet = useSelector(selectFavoriteIdsSet);
  const isFav = id ? favoriteIdsSet.has(id) : false;

  const cover = listing.cover_url || listing.images?.[0]?.url;
  const coverSrc = cover || "/placeholder-room.svg";
  const rating = Number(listing.avg_rating || 0);
  const ratingText = rating > 0 ? rating.toFixed(1) : t("common.new");
  const distanceKm = listing.distance_km != null ? Number(listing.distance_km) : null;
  const distanceText = Number.isFinite(distanceKm) ? `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km` : null;

  async function onToggleFav() {
    if (!isInitialized) return;
    if (!user) {
      notifyError(t("listing.favoriteLogin"));
      router.push("/login");
      return;
    }

    if (!id) return;

    const res = await dispatch(toggleFavorite(id));
    if (res?.ok) {
      notifySuccess(
        res.favorited
          ? t("listing.favoriteAdded")
          : t("listing.favoriteRemoved"),
      );
    } else {
      notifyError(res?.message || t("listing.favoriteFailed"));
    }
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-line bg-surface transition duration-200 hover:-translate-y-0.5 hover:shadow-soft motion-reduce:hover:translate-y-0">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted-surface">
        <Link href={id ? `/rooms/${id}` : "#"} className="block h-full">
          <Image
            src={coverSrc}
            alt={listing?.title || t("listing.fallbackTitle")}
            fill
            sizes="(max-width: 768px) 85vw, (max-width: 1200px) 42vw, 292px"
            className="object-cover transition duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
            priority={priority}
          />
        </Link>

        <button
          type="button"
          onClick={onToggleFav}
          disabled={!isInitialized}
          aria-label={
            isFav ? t("listing.favoriteRemove") : t("listing.favoriteAdd")
          }
          className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-surface/95 text-ink shadow-sm transition hover:scale-105 disabled:opacity-60"
        >
          <Heart
            aria-hidden
            size={21}
            weight={isFav ? "fill" : "regular"}
            className={isFav ? "text-brand" : undefined}
          />
        </button>
      </div>

      <Link href={id ? `/rooms/${id}` : "#"} className="block p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-ink">
              {listing?.title || t("listing.fallbackTitle")}
            </h3>
            <p className="mt-1 truncate text-sm text-muted-ink">
              {listing?.city || ""}
              {listing?.country ? `, ${listing.country}` : ""}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1 text-sm text-ink">
            <Star aria-hidden size={16} weight="fill" />
            <span>{ratingText}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-ink">
            <span className="font-bold">
              {formatVND(
                listing?.price_per_night || listing?.price || 0,
                locale === "en" ? "en-US" : "vi-VN",
              )}
            </span>
            <span className="text-muted-ink"> {t("listing.perNight")}</span>
          </div>

          {distanceText ? (
            <div className="text-sm text-muted-ink">
              {t("listing.distance", { distance: distanceText })}
            </div>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
