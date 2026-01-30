import { serverGetJson } from "@/lib/serverApi";
import { StarIcon } from "@/components/icons";
import Link from "next/link";
import { notFound } from "next/navigation";
import RoomTabs from "@/components/RoomTabs";
import MapboxStaticMap from "@/components/MapboxStaticMap";
import BookingCard from "@/components/BookingCard";
import ReviewsSection from "@/components/ReviewsSection";

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function RoomDetailPage({ params, searchParams }) {
  const p = await params;
  const id = p?.id;
  if (!id || id === "undefined") return notFound();
  const sp = await searchParams;

  let res;
  let fetchError = null;
  try {
    res = await serverGetJson(`/api/v1/listings/${id}`);
  } catch (e) {
    fetchError = e;
  }

  if (fetchError) {
    return (
      <div className="max-w-3xl px-4 py-16 mx-auto">
        <div className="p-6 bg-white border rounded-2xl">
          <h1 className="text-xl font-semibold">Không tải được phòng</h1>
          <p className="mt-2 text-slate-600">
            Lý do: {fetchError?.message || "Request failed"}.
          </p>
          <p className="mt-2 text-slate-600">
            Nếu bạn vừa tạo DB, hãy chắc chắn đã chạy seed (bảng <b>listings</b>{" "}
            có dữ liệu).
          </p>
          <div className="flex gap-3 mt-4">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-semibold text-white rounded-xl bg-rose-500 hover:bg-rose-600"
            >
              Về trang chủ
            </Link>
            <Link
              href="/search"
              className="px-4 py-2 text-sm font-semibold border rounded-xl hover:bg-slate-50"
            >
              Tới tìm kiếm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const listing = res.data?.listing;
  const reviews = res.data?.reviews || [];

  if (!listing) return notFound();

  const images = listing?.images || [];
  const cover = images.find((x) => x.is_cover) || images[0];
  const rating =
    toNumber(listing?.avg_rating) ??
    toNumber(
      reviews?.reduce((s, r) => s + Number(r.rating || 0), 0) /
        Math.max(1, reviews.length),
    );
  const reviewCount = toNumber(listing?.review_count) ?? reviews.length;

  return (
    <div className="pb-10">
      <div className="max-w-6xl px-4 pt-6 mx-auto">
        <Link href="/search" className="text-sm text-slate-600 hover:underline">
          ← Quay lại tìm kiếm
        </Link>

        <div className="mt-2 space-y-1">
          <h1 className="text-2xl font-semibold">{listing.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <div className="flex items-center gap-1">
              <StarIcon className="w-4 h-4 text-slate-900" />
              <span>{rating ? rating.toFixed(2) : "Mới"}</span>
            </div>
            <span className="text-slate-300">•</span>
            <span>{reviewCount} đánh giá</span>
            <span className="text-slate-300">•</span>
            <span className="underline">
              {listing.city}, {listing.country}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs like Airbnb */}
      <RoomTabs />

      <div className="max-w-6xl px-4 mx-auto">
        {/* Photos */}
        <section id="photos" className="pt-6 scroll-mt-28">
          <div className="grid gap-2 md:grid-cols-4">
            <div className="overflow-hidden md:col-span-2 rounded-2xl bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover?.url || "https://picsum.photos/seed/cover/1200/800"}
                alt={listing.title}
                className="object-cover w-full h-80"
              />
            </div>
            <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
              {images.slice(1, 5).map((im) => (
                <div
                  key={im.id}
                  className="overflow-hidden rounded-2xl bg-slate-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={im.url}
                    alt=""
                    className="object-cover w-full h-40"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Content + payment sidebar */}
        <div className="grid gap-8 mt-6 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section className="p-5 bg-white border rounded-2xl">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={listing.host?.avatar_url || "https://i.pravatar.cc/150"}
                  alt=""
                  className="object-cover w-10 h-10 rounded-full"
                />
                <div>
                  <div className="font-semibold">
                    Chủ nhà: {listing.host?.full_name}
                  </div>
                  <div className="text-sm text-slate-600">
                    {listing.max_guests} khách • {listing.bedrooms} phòng ngủ •{" "}
                    {listing.beds} giường • {listing.bathrooms} phòng tắm
                  </div>
                </div>
              </div>
              <p className="mt-4 text-slate-700">{listing.description}</p>
            </section>

            <section
              id="amenities"
              className="p-5 bg-white border scroll-mt-28 rounded-2xl"
            >
              <h2 className="text-lg font-semibold">
                Nơi này có những gì cho bạn
              </h2>
              <div className="grid gap-2 mt-3 sm:grid-cols-2">
                {(listing.amenities || []).map((a) => (
                  <div
                    key={a.id}
                    className="px-3 py-2 text-sm border rounded-xl"
                  >
                    {a.name}
                  </div>
                ))}
              </div>
              <button
                className="px-4 py-2 mt-4 text-sm font-medium border rounded-xl hover:bg-slate-50"
                disabled
                title="Sprint 3+"
              >
                Hiển thị tất cả tiện nghi
              </button>
            </section>

            <ReviewsSection
              listingId={listing.id}
              initialAvg={rating}
              initialCount={reviewCount}
              autoFocusComposer={String(sp?.review || "") === "1"}
            />

            <section
              id="location"
              className="p-5 bg-white border scroll-mt-28 rounded-2xl"
            >
              <h2 className="text-lg font-semibold">Vị trí</h2>
              <p className="mt-2 text-slate-700">
                {listing.address || "Địa chỉ đang cập nhật"} • {listing.city},{" "}
                {listing.country}
              </p>
              <div className="mt-4">
                <MapboxStaticMap lat={listing.lat} lng={listing.lng} />
              </div>
            </section>
          </div>

          <BookingCard listing={listing} />
        </div>
      </div>
    </div>
  );
}
