import { serverGetJson } from "@/lib/serverApi";
import { formatVND } from "@/lib/format";
import { StarIcon } from "@/components/icons";
import Link from "next/link";
import { notFound } from "next/navigation";
import RoomTabs from "@/components/RoomTabs";
import MapboxStaticMap from "@/components/MapboxStaticMap";

function avgRating(reviews) {
  if (!reviews?.length) return null;
  const v = reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length;
  return Number.isFinite(v) ? v : null;
}

export default async function RoomDetailPage({ params }) {
  const p = await params;
  const id = p?.id;
  if (!id || id === "undefined") return notFound();

  let res;
let fetchError = null;
try {
  res = await serverGetJson(`/api/v1/listings/${id}`);
} catch (e) {
  fetchError = e;
}

if (fetchError) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-xl font-semibold">Không tải được phòng</h1>
        <p className="mt-2 text-slate-600">
          Lý do: {fetchError?.message || "Request failed"}.
        </p>
        <p className="mt-2 text-slate-600">
          Nếu bạn vừa tạo DB, hãy chắc chắn đã chạy seed (bảng <b>listings</b> có dữ liệu).
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/" className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600">
            Về trang chủ
          </Link>
          <Link href="/search" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
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
  const rating = avgRating(reviews);

  return (
    <div className="pb-10">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <Link href="/search" className="text-sm text-slate-600 hover:underline">← Quay lại tìm kiếm</Link>

        <div className="mt-2 space-y-1">
          <h1 className="text-2xl font-semibold">{listing.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <div className="flex items-center gap-1">
              <StarIcon className="h-4 w-4 text-slate-900" />
              <span>{rating ? rating.toFixed(2) : "Mới"}</span>
            </div>
            <span className="text-slate-300">•</span>
            <span>{reviews.length} đánh giá</span>
            <span className="text-slate-300">•</span>
            <span className="underline">{listing.city}, {listing.country}</span>
          </div>
        </div>
      </div>

      {/* Tabs like Airbnb */}
      <RoomTabs />

      <div className="mx-auto max-w-6xl px-4">
        {/* Photos */}
        <section id="photos" className="scroll-mt-28 pt-6">
          <div className="grid gap-2 md:grid-cols-4">
            <div className="md:col-span-2 overflow-hidden rounded-2xl bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={(cover?.url) || "https://picsum.photos/seed/cover/1200/800"}
                alt={listing.title}
                className="h-80 w-full object-cover"
              />
            </div>
            <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
              {images.slice(1, 5).map((im) => (
                <div key={im.id} className="overflow-hidden rounded-2xl bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt="" className="h-40 w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Content + payment sidebar */}
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <section className="rounded-2xl border bg-white p-5">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={listing.host?.avatar_url || "https://i.pravatar.cc/150"} alt="" className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <div className="font-semibold">Chủ nhà: {listing.host?.full_name}</div>
                  <div className="text-sm text-slate-600">
                    {listing.max_guests} khách • {listing.bedrooms} phòng ngủ • {listing.beds} giường • {listing.bathrooms} phòng tắm
                  </div>
                </div>
              </div>
              <p className="mt-4 text-slate-700">{listing.description}</p>
            </section>

            <section id="amenities" className="scroll-mt-28 rounded-2xl border bg-white p-5">
              <h2 className="text-lg font-semibold">Nơi này có những gì cho bạn</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(listing.amenities || []).map((a) => (
                  <div key={a.id} className="rounded-xl border px-3 py-2 text-sm">
                    {a.name}
                  </div>
                ))}
              </div>
              <button className="mt-4 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50" disabled title="Sprint 3+">
                Hiển thị tất cả tiện nghi
              </button>
            </section>

            <section id="reviews" className="scroll-mt-28 rounded-2xl border bg-white p-5">
              <h2 className="text-lg font-semibold">Đánh giá</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {reviews.slice(0, 6).map((rv) => (
                  <div key={rv.id} className="rounded-2xl border p-4">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={rv.reviewer?.avatar_url || "https://i.pravatar.cc/150"} alt="" className="h-8 w-8 rounded-full object-cover" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{rv.reviewer?.full_name}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <StarIcon className="h-3 w-3 text-slate-900" />
                          <span>{rv.rating}</span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{rv.comment}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="location" className="scroll-mt-28 rounded-2xl border bg-white p-5">
              <h2 className="text-lg font-semibold">Vị trí</h2>
              <p className="mt-2 text-slate-700">
                {listing.address || "Địa chỉ đang cập nhật"} • {listing.city}, {listing.country}
              </p>
              <div className="mt-4">
                <MapboxStaticMap lat={listing.lat} lng={listing.lng} />
              </div>
            </section>
          </div>

          {/* Payment box (UI only like Airbnb) */}
          <aside className="h-fit lg:sticky lg:top-28 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-end justify-between">
              <div className="text-xl font-semibold">
                {formatVND(listing.price_per_night)} <span className="text-sm font-normal text-slate-600">/ đêm</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-slate-700">
                <StarIcon className="h-4 w-4 text-slate-900" />
                <span>{rating ? rating.toFixed(2) : "Mới"}</span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border">
              <div className="grid grid-cols-2">
                <div className="border-b border-r p-3">
                  <div className="text-[10px] font-semibold uppercase text-slate-700">Nhận phòng</div>
                  <div className="mt-1 text-sm text-slate-600">--/--/----</div>
                </div>
                <div className="border-b p-3">
                  <div className="text-[10px] font-semibold uppercase text-slate-700">Trả phòng</div>
                  <div className="mt-1 text-sm text-slate-600">--/--/----</div>
                </div>
              </div>
              <div className="p-3">
                <div className="text-[10px] font-semibold uppercase text-slate-700">Khách</div>
                <div className="mt-1 text-sm text-slate-600">1 khách</div>
              </div>
            </div>

            <button
              className="mt-4 w-full rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
              disabled
              title="Sprint 3: Booking + Payment"
            >
              Đặt phòng (Sprint 3)
            </button>

            <p className="mt-3 text-xs text-slate-600">
              Sprint 2: giao diện + hiển thị dữ liệu. Sprint 3 mới làm đặt phòng/thanh toán.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
