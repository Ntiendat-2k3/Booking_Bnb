import { serverGetJson } from "@/lib/serverApi";
import { cache } from "react";
import { StarIcon } from "@/components/icons";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import RoomTabs from "@/components/RoomTabs";
import Container from "@/components/layout/Container";
import MapboxStaticMap from "@/components/MapboxStaticMap";
import BookingCard from "@/components/Booking/BookingCard";
import ReviewsSection from "@/components/Reviews";
import ImageGallery from "@/components/Room/ImageGallery";
import ContactHostButton from "@/components/ContactHostButton";

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const getListingDetail = cache(async (id) => {
  return serverGetJson(`/api/v1/listings/${id}`, { next: { revalidate: 300 } });
});

export async function generateMetadata({ params }) {
  const p = await Promise.resolve(params);
  const id = p?.id;
  if (!id || id === "undefined") return { title: "Không tìm thấy phòng" };

  try {
    const res = await getListingDetail(id);
    const ok = res?.status === "success" || res?.success === true;
    const listing = ok ? res.data?.listing : null;
    if (!listing) return { title: "Không tìm thấy phòng" };

    const images = listing?.images || [];
    const cover = images.find((x) => x.is_cover) || images[0];

    const title = `${listing.title} | Booking BnB`;
    const description =
      (listing.description || "").slice(0, 160) ||
      `Chỗ ở tại ${listing.city}, ${listing.country}. ${listing.max_guests} khách • ${listing.bedrooms} phòng ngủ.`;

    return {
      title,
      description,
      alternates: { canonical: `/rooms/${listing.id}` },
      openGraph: {
        title,
        description,
        type: "website",
        images: cover?.url
          ? [{ url: cover.url, width: 1200, height: 630, alt: listing.title }]
          : [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: cover?.url ? [cover.url] : [],
      },
    };
  } catch {
    return { title: "Chi tiết phòng" };
  }
}

export default async function RoomDetailPage({ params, searchParams }) {
  const p = await Promise.resolve(params);
  const sp = await Promise.resolve(searchParams);
  const id = p?.id;
  if (!id || id === "undefined") return notFound();

  let res;
  let fetchError = null;
  try {
    res = await getListingDetail(id);
  } catch (e) {
    // For SEO: return 404 page when listing doesn't exist
    if (e?.status === 404) return notFound();
    fetchError = e;
  }

  const ok = res?.status === "success" || res?.success === true;

  // --- FIX LỖI ĐÓNG THẺ CONTAINER TẠI ĐÂY ---
  if (fetchError || !ok) {
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
        <section id="photos" className="pt-6 scroll-mt-28">
          <ImageGallery images={listing.images} title={listing.title} />
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
                <Image
                  src={listing.host?.avatar_url || "https://i.pravatar.cc/150"}
                  alt="Host"
                  width={56}
                  height={56}
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

            <section id="host" className="py-8 border-b scroll-mt-28">
              <h2 className="text-xl font-semibold mb-6">Gặp gỡ chủ nhà</h2>
              <div className="bg-slate-50 p-6 rounded-3xl flex flex-col md:flex-row gap-8 items-start">
                <div className="flex flex-col items-center gap-4 min-w-[200px]">
                  <Image
                    src={listing.host?.avatar_url || "https://i.pravatar.cc/150"}
                    alt={listing.host?.full_name}
                    width={100}
                    height={100}
                    className="w-24 h-24 rounded-full object-cover shadow-md"
                  />
                  <div className="text-center">
                    <h3 className="text-lg font-bold">{listing.host?.full_name}</h3>
                    <p className="text-sm text-slate-500">{listing.host?.location || "Chưa cập nhật địa điểm"}</p>
                  </div>
                  <div className="mt-2">
                    <ContactHostButton hostId={listing.host?.id} />
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Giới thiệu</h4>
                    <p className="text-slate-600 leading-relaxed italic">
                      {listing.host?.about || "Chủ nhà chưa cập nhật phần giới thiệu cá nhân."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

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
