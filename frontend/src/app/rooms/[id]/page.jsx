import { serverGetJson } from "@/lib/serverApi";
import { cache } from "react";
import {
  ArrowLeft,
  Check,
  Star,
} from "@phosphor-icons/react/dist/ssr";
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
import { buildListingMetadata, buildListingJsonLd } from "@/lib/seo";
import { getServerTranslator } from "@/i18n/server";

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const getListingDetail = cache(async (id) => {
  return serverGetJson(`/api/v1/listings/${id}`, { next: { revalidate: 300 } });
});

export async function generateMetadata({ params }) {
  const { t, locale } = await getServerTranslator();
  const p = await Promise.resolve(params);
  const id = p?.id;
  if (!id || id === "undefined") return { title: t("room.notFoundTitle") };

  try {
    const res = await getListingDetail(id);
    const ok = res?.status === "success" || res?.success === true;
    const listing = ok ? res.data?.listing : null;
    return buildListingMetadata(listing, { t, locale });
  } catch {
    return { title: t("room.detailTitle") };
  }
}

export default async function RoomDetailPage({ params, searchParams }) {
  const { t } = await getServerTranslator();
  const p = await Promise.resolve(params);
  const sp = await Promise.resolve(searchParams);
  const id = p?.id;
  if (!id || id === "undefined") return notFound();

  let res;
  let fetchError = null;
  try {
    res = await getListingDetail(id);
  } catch (e) {
    // Trả về trang 404 để công cụ tìm kiếm không lập chỉ mục dữ liệu không tồn tại.
    if (e?.status === 404) return notFound();
    fetchError = e;
  }

  const ok = res?.status === "success" || res?.success === true;

  if (fetchError || !ok) {
    return (
      <Container className="py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h1 className="text-xl font-bold text-danger">
            {t("room.loadFailed")}
          </h1>
          <p className="mt-2 text-muted-ink">
            {t("room.reason", {
              reason:
                fetchError?.message ||
                res?.message ||
                t("room.requestFailed"),
            })}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              {t("room.backHome")}
            </Link>
            <Link
              href="/search"
              className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-muted-surface"
            >
              {t("room.goSearch")}
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  const listing = res.data?.listing;
  const reviews = res.data?.reviews || [];

  if (!listing) return notFound();

  const avgFromReviews =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length
      : 0;
  const rating = toNumber(listing?.avg_rating) ?? avgFromReviews;
  const reviewCount = toNumber(listing?.review_count) ?? reviews.length;

  const jsonLd = buildListingJsonLd(listing, reviews);

  return (
    <div className="pb-10">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      <Container className="pt-6">
        <Link
          href="/search"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-ink transition hover:text-ink"
        >
          <ArrowLeft aria-hidden size={18} />
          {t("room.backSearch")}
        </Link>

        <div className="mt-3 space-y-2">
          <h1 className="max-w-4xl text-3xl font-bold tracking-[-0.035em] text-ink sm:text-4xl">
            {listing.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-ink">
            <div className="flex items-center gap-1">
              <Star aria-hidden size={16} weight="fill" className="text-brand" />
              <span>{rating > 0 ? rating.toFixed(1) : t("common.new")}</span>
            </div>
            <span className="text-line">·</span>
            <span className="underline">
              {t("room.reviewCount", { count: reviewCount })}
            </span>
            <span className="text-line">·</span>
            <span className="underline">
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

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            <section className="border-b border-line pb-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold tracking-[-0.02em] text-ink">
                    {t("room.entireHomeHostedBy", {
                      host: listing.host?.full_name || "",
                    })}
                  </h2>
                  <div className="mt-2 text-sm leading-6 text-muted-ink">
                    {t("room.staySummary", {
                      guests: listing.max_guests,
                      bedrooms: listing.bedrooms,
                      beds: listing.beds,
                      bathrooms: listing.bathrooms,
                    })}
                  </div>
                </div>
                <Image
                  src={listing.host?.avatar_url || "https://i.pravatar.cc/150"}
                  alt={listing.host?.full_name || t("contact.host")}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full border border-line object-cover shadow-sm"
                />
              </div>
            </section>

            <section className="border-b border-line pb-8">
              <h2 className="mb-4 text-2xl font-bold tracking-[-0.025em] text-ink">
                {t("room.description")}
              </h2>
              <p className="whitespace-pre-line leading-7 text-muted-ink">
                {listing.description}
              </p>
            </section>

            <section id="amenities" className="scroll-mt-32 border-b border-line pb-8">
              <h2 className="text-2xl font-bold tracking-[-0.025em] text-ink">
                {t("room.amenities")}
              </h2>
              <div className="grid gap-4 mt-4 sm:grid-cols-2">
                {(listing.amenities || []).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 text-muted-ink"
                  >
                    <Check aria-hidden size={20} className="text-positive" />
                    <span>{a.name}</span>
                  </div>
                ))}
              </div>
            </section>

            <ReviewsSection
              listingId={listing.id}
              initialAvg={rating}
              initialCount={reviewCount}
              initialItems={reviews}
              autoFocusComposer={String(sp?.review || "") === "1"}
            />

            <section id="host" className="scroll-mt-32 border-b border-line py-8">
              <h2 className="mb-6 text-2xl font-bold tracking-[-0.025em] text-ink">
                {t("room.meetHost")}
              </h2>
              <div className="flex flex-col items-start gap-8 rounded-[20px] bg-muted-surface p-6 md:flex-row">
                <div className="flex flex-col items-center gap-4 min-w-[200px]">
                  <Image
                    src={listing.host?.avatar_url || "https://i.pravatar.cc/150"}
                    alt={listing.host?.full_name}
                    width={100}
                    height={100}
                    className="h-24 w-24 rounded-full object-cover shadow-sm"
                  />
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-ink">{listing.host?.full_name}</h3>
                    <p className="text-sm text-muted-ink">
                      {listing.host?.location || t("room.hostLocationMissing")}
                    </p>
                  </div>
                  <div className="mt-2">
                    <ContactHostButton hostId={listing.host?.id} />
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="mb-2 font-semibold text-ink">
                      {t("room.hostAbout")}
                    </h3>
                    <p className="leading-7 text-muted-ink">
                      {listing.host?.about || t("room.hostAboutMissing")}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section id="location" className="scroll-mt-32 pt-8">
              <h2 className="text-2xl font-bold tracking-[-0.025em] text-ink">
                {t("room.location")}
              </h2>
              <p className="mb-4 mt-2 text-muted-ink">
                {listing.address} · {listing.city}, {listing.country}
              </p>
              <MapboxStaticMap
                lat={listing.lat}
                lng={listing.lng}
                heightClass="h-[400px]"
              />
            </section>
          </div>

          <BookingCard listing={listing} />
        </div>
      </Container>
    </div>
  );
}
