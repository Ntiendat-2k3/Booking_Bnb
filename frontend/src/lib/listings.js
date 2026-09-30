/** Chỉ truyền dữ liệu dùng bởi card và popup bản đồ qua ranh giới server/client. */
export function getListingCardData(listing) {
  return {
    id: listing.id || listing.listing_id || listing.uuid,
    title: listing.title,
    city: listing.city,
    country: listing.country,
    cover_url: listing.cover_url || listing.images?.[0]?.url,
    price_per_night: listing.price_per_night || listing.price || 0,
    avg_rating: listing.avg_rating,
    review_count: listing.review_count,
    distance_km: listing.distance_km,
    lat: listing.lat,
    lng: listing.lng,
  };
}
