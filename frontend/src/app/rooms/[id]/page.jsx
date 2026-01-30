import { serverGetJson } from "@/lib/serverApi";
import { StarIcon } from "@/components/icons";
import Link from "next/link";
import { notFound } from "next/navigation";
import RoomTabs from "@/components/RoomTabs";
import Container from "@/components/layout/Container";
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

  // --- FIX LỖI ĐÓNG THẺ CONTAINER TẠI ĐÂY ---
  if (fetchError || !res?.success) {
    return (
      <Container className="py-16">
        <div className="max-w-2xl p-6 mx-auto bg-white border rounded-2xl">
          <h1 className="text-xl font-semibold text-rose-600">
            Không tải được phòng
          </h1>
          <p className="mt-2 text-slate-600">
            Lý do: {fetchError?.message || res?.message || "Yêu cầu thất bại"}.
          </p>
          <div className="flex gap-3 mt-6">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-semibold text-white rounded-xl bg-brand hover:opacity-90"
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
      </Container>
    );
  }

  const listing = res.data?.listing;
  const reviews = res.data?.reviews || [];

  if (!listing) return notFound();

  // Xử lý ảnh
  const images = listing?.images || [];
  const cover = images.find((x) => x.is_cover) || images[0];

  // Tính toán rating an toàn hơn
  const avgFromReviews =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length
      : 0;
  const rating = toNumber(listing?.avg_rating) ?? avgFromReviews;
  const reviewCount = toNumber(listing?.review_count) ?? reviews.length;

  return (
    <div className="pb-10 bg-white">
      <Container className="pt-6">
        <Link
          href="/search"
          className="text-sm font-medium text-slate-600 hover:underline"
        >
          ← Quay lại tìm kiếm
        </Link>

        <div className="mt-4 space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">{listing.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
            <div className="flex items-center gap-1">
              <StarIcon className="w-4 h-4 text-brand" />
              <span>{rating > 0 ? rating.toFixed(2) : "Mới"}</span>
            </div>
            <span className="text-slate-300">•</span>
            <span className="underline cursor-pointer">
              {reviewCount} đánh giá
            </span>
            <span className="text-slate-300">•</span>
            <span className="underline cursor-pointer">
              {listing.city}, {listing.country}
            </span>
          </div>
        </div>
      </Container>

      <RoomTabs />

      <Container>
        {/* Photos Grid */}
        <section id="photos" className="pt-6 scroll-mt-28">
          <div className="grid grid-cols-1 gap-2 overflow-hidden md:grid-cols-4 rounded-2xl">
            <div className="md:col-span-2 h-[300px] md:h-[410px]">
              <img
                src={cover?.url || "https://picsum.photos/seed/cover/1200/800"}
                alt={listing.title}
                className="object-cover w-full h-full transition-all cursor-pointer hover:brightness-90"
              />
            </div>
            <div className="hidden grid-cols-2 gap-2 md:grid md:col-span-2">
              {/* Hiển thị tối đa 4 ảnh nhỏ bên cạnh */}
              {images
                .filter((im) => im.id !== cover?.id)
                .slice(0, 4)
                .map((im) => (
                  <div key={im.id} className="h-[201px]">
                    <img
                      src={im.url}
                      alt=""
                      className="object-cover w-full h-full transition-all cursor-pointer hover:brightness-90"
                    />
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* Info & Booking Section */}
        <div className="grid gap-8 mt-8 lg:grid-cols-3">
          {/* Main Info */}
          <div className="space-y-8 lg:col-span-2">
            <section className="pb-8 border-b">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">
                    Toàn bộ nhà. Chủ nhà: {listing.host?.full_name}
                  </h2>
                  <div className="text-slate-600">
                    {listing.max_guests} khách • {listing.bedrooms} phòng ngủ •{" "}
                    {listing.beds} giường • {listing.bathrooms} phòng tắm
                  </div>
                </div>
                <img
                  src={listing.host?.avatar_url || "https://i.pravatar.cc/150"}
                  alt="Host"
                  className="object-cover border rounded-full shadow-sm w-14 h-14"
                />
              </div>
            </section>

            <section className="pb-8 border-b">
              <h3 className="mb-4 text-lg font-semibold">Mô tả</h3>
              <p className="leading-relaxed whitespace-pre-line text-slate-700">
                {listing.description}
              </p>
            </section>

            <section id="amenities" className="pb-8 border-b scroll-mt-28">
              <h2 className="text-xl font-semibold">
                Nơi này có những gì cho bạn
              </h2>
              <div className="grid gap-4 mt-4 sm:grid-cols-2">
                {(listing.amenities || []).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 text-slate-700"
                  >
                    <span className="text-lg">✓</span>
                    <span>{a.name}</span>
                  </div>
                ))}
              </div>
            </section>

            <ReviewsSection
              listingId={listing.id}
              initialAvg={rating}
              initialCount={reviewCount}
              autoFocusComposer={String(sp?.review || "") === "1"}
            />

            <section id="location" className="pt-8 scroll-mt-28">
              <h2 className="text-xl font-semibold">Nơi bạn sẽ đến</h2>
              <p className="mt-2 mb-4 text-slate-600">
                {listing.address} • {listing.city}, {listing.country}
              </p>
              <div className="overflow-hidden border rounded-2xl h-[400px]">
                <MapboxStaticMap lat={listing.lat} lng={listing.lng} />
              </div>
            </section>
          </div>

          {/* Sidebar Booking Card */}
          <aside className="relative">
            <div className="sticky top-28">
              <BookingCard listing={listing} />
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
