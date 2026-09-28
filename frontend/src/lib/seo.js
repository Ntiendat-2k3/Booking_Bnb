/**
 * Tạo metadata theo ngôn ngữ hiện tại và dữ liệu có cấu trúc cho chỗ ở.
 */

import { CATEGORIES } from "./constants";
import { createTranslator } from "@/i18n/config";

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(
    /\/$/,
    "",
  );

// Dữ liệu chỗ ở theo hợp đồng schema.org.
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

  // Chỉ khai báo giá khi dữ liệu chỗ ở có giá.
  if (listing.price_per_night) {
    jsonLd.makesOffer = {
      "@type": "Offer",
      price: listing.price_per_night,
      priceCurrency: "VND",
      availability: "https://schema.org/InStock",
      url: `${siteUrl()}/rooms/${listing.id}`,
    };
  }

  // Không khai báo đánh giá tổng hợp khi chưa có đánh giá.
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

export function buildListingMetadata(listing, { locale = "vn", t = createTranslator(locale) } = {}) {
  if (!listing) return { title: t("room.notFoundTitle") };

  const images = listing.images || [];
  const cover = images.find((x) => x.is_cover) || images[0];

  const title = listing.title;
  const description =
    (listing.description || "").slice(0, 160) ||
    t("seo.listingFallback", { city: listing.city, country: listing.country, guests: listing.max_guests, bedrooms: listing.bedrooms });

  return {
    title,
    description,
    alternates: { canonical: `/rooms/${listing.id}` },
    openGraph: {
      title,
      description,
      type: "website",
      locale: locale === "en" ? "en_US" : "vi_VN",
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

export function buildSearchMetadata(searchParams = {}, { locale = "vn", t = createTranslator(locale) } = {}) {
  const city = searchParams.city;
  const category = CATEGORIES.find(item => item.key === searchParams.property_type);
  const propertyType = category ? t(category.labelKey) : searchParams.property_type;
  const site = t("seo.siteName");

  let title = t("seo.searchTitle");
  let description = t("seo.defaultDescription");

  if (city && propertyType) {
    title = t("seo.typeCityTitle", { type: propertyType, city });
    description = t("seo.cityDescription", { city, site });
  } else if (city) {
    title = t("seo.cityTitle", { city });
    description = t("seo.cityDescription", { city, site });
  } else if (propertyType) {
    title = propertyType;
    description = t("seo.typeDescription", { type: propertyType, site });
  }

  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      locale: locale === "en" ? "en_US" : "vi_VN",
    },
  };
}
