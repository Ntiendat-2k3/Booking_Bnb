import Link from "next/link";
import Image from "next/image";
import { formatVND } from "@/lib/format";
import { StarIcon } from "@/components/icons";

export default function MapPopupCard({ listing, onClose }) {
  if (!listing) return null;

  const id = listing?.id || listing?.listing_id || listing?.uuid;
  const cover = listing?.cover_url || listing?.images?.[0]?.url;
  const rating = Number(listing?.avg_rating || 0);
  const ratingText = rating > 0 ? rating.toFixed(1) : "Mới";
  const distanceKm =
    listing?.distance_km != null ? Number(listing?.distance_km) : null;
  const distanceText = Number.isFinite(distanceKm)
    ? `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`
    : null;

  return (
    <div className="absolute bottom-3 left-3 z-10 w-[320px] rounded-2xl border bg-white shadow-lg">
      <div className="relative">
        {cover ? (
          <div className="relative h-40 w-full">
            <Image
              src={cover}
              alt={listing?.title || "Listing"}
              fill
              sizes="320px"
              className="object-cover rounded-t-2xl"
            />
          </div>
        ) : (
          <div className="w-full h-40 rounded-t-2xl bg-slate-200" />
        )}

        <button
          type="button"
          onClick={onClose}
          className="absolute grid rounded-full shadow right-2 top-2 h-9 w-9 place-items-center bg-white/95 hover:bg-white"
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold truncate">
              {listing?.title || "Chỗ ở"}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {listing?.city || ""}
              {distanceText ? (
                <span className="ml-2">• Cách bạn {distanceText}</span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1 text-sm shrink-0">
            <StarIcon className="w-4 h-4" />
            <span className="font-medium">{ratingText}</span>
            {Number(listing?.review_count || 0) > 0 ? (
              <span className="text-slate-600">
                ({Number(listing.review_count)})
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-end justify-between mt-3">
          <div className="text-base font-semibold">
            {formatVND(listing?.price_per_night)}
          </div>
          {id ? (
            <Link
              href={`/rooms/${id}`}
              className="px-3 py-2 text-sm font-semibold text-white bg-black rounded-xl hover:opacity-90"
            >
              Xem chi tiết
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
