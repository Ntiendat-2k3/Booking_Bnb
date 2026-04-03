/**
 * SEO helpers for generating structured data and metadata.
 * Reusable across pages — call these helpers instead of copy-pasting metadata objects.
 */

import { SITE_NAME, SITE_DESCRIPTION, SITE_LOCALE } from "./constants";

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(
    /\/$/,
    "",
  );

// ─── JSON-LD: LodgingBusiness for a listing ──────────────────────
export function buildListingJsonLd(listing, reviews = []) {
  if (!listing) return null;

  const images = listing.images || [];
  const cover = images.find((x) => x.is_cover) || images[0];
  const rating = Number(listing.avg_rating || 0);
  const reviewCount = Number(listing.review_count || reviews.length || 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: listing.title,
    description: (listing.description || "").slice(0, 300),
    url: `${siteUrl()}/rooms/${listing.id}`,
    image: cover?.url || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: listing.address || undefined,
      addressLocality: listing.city || undefined,
      addressCountry: listing.country || undefined,
    },
    geo:
      listing.lat && listing.lng
        ? {
            "@type": "GeoCoordinates",
            latitude: listing.lat,
            longitude: listing.lng,
          }
        : undefined,
    priceRange: `${listing.price_per_night} VND`,
    numberOfRooms: listing.bedrooms || undefined,
  };

  // Add offers
  if (listing.price_per_night) {
    jsonLd.makesOffer = {
      "@type": "Offer",
      price: listing.price_per_night,
      priceCurrency: "VND",
      availability: "https://schema.org/InStock",
      url: `${siteUrl()}/rooms/${listing.id}`,
    };
  }

  // Add aggregate rating
  if (rating > 0 && reviewCount > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating.toFixed(2),
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return jsonLd;
}

// ─── Metadata helper for listing pages ───────────────────────────
export function buildListingMetadata(listing) {
  if (!listing) return { title: "Không tìm thấy phòng" };

  const images = listing.images || [];
  const cover = images.find((x) => x.is_cover) || images[0];

  const title = `${listing.title} | ${SITE_NAME}`;
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
      locale: SITE_LOCALE,
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
}

// ─── Metadata helper for search page ─────────────────────────────
export function buildSearchMetadata(searchParams = {}) {
  const city = searchParams.city;
  const propertyType = searchParams.property_type;

  let title = "Tìm kiếm chỗ ở";
  let description = SITE_DESCRIPTION;

  if (city && propertyType) {
    title = `${propertyType} tại ${city}`;
    description = `Tìm ${propertyType.toLowerCase()} tại ${city}. So sánh giá, đánh giá và đặt phòng nhanh trên ${SITE_NAME}.`;
  } else if (city) {
    title = `Chỗ ở tại ${city}`;
    description = `Khám phá các chỗ ở tốt nhất tại ${city}. So sánh giá, xem đánh giá và đặt phòng trên ${SITE_NAME}.`;
  } else if (propertyType) {
    title = `${propertyType} — ${SITE_NAME}`;
    description = `Tìm ${propertyType.toLowerCase()} phù hợp với bạn. Đặt phòng nhanh chóng trên ${SITE_NAME}.`;
  }

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      locale: SITE_LOCALE,
    },
  };
}
