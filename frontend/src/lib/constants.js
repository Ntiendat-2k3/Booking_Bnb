/**
 * Centralized constants for the Booking BnB frontend.
 * Import from here instead of hardcoding values in components.
 */

// ─── Site Info ────────────────────────────────────────────────────
export const SITE_NAME = "Booking BnB";
export const SITE_DESCRIPTION =
  "Đặt phòng nhanh, tìm chỗ ở theo thành phố, giá, và vị trí gần bạn.";
export const SITE_LOCALE = "vi_VN";
export const SITE_LANG = "vi";
export const SITE_CURRENCY = "VND";

// ─── Property Categories ─────────────────────────────────────────
export const CATEGORIES = [
  { key: "Căn hộ", label: "Căn hộ" },
  { key: "Nhà", label: "Nhà" },
  { key: "Khách sạn", label: "Khách sạn" },
  { key: "Villa", label: "Villa" },
  { key: "Hanok", label: "Hanok" },
  { key: "Nhà khách", label: "Nhà khách" },
  { key: "Phòng", label: "Phòng" },
];

// ─── Homepage Section Configuration ──────────────────────────────
export const SECTION_CONFIG = [
  { title: "Gợi ý cho bạn", limit: 12 },
  { title: "Được khách yêu thích tại Hồ Chí Minh", city: "Hồ Chí Minh", limit: 10 },
  { title: "Chỗ ở nổi bật tại Hà Nội", city: "Hà Nội", limit: 10 },
  { title: "Trốn nóng ở Đà Nẵng", city: "Đà Nẵng", limit: 10 },
  { title: "Chỗ ở tại Huyện Văn Giang", city: "Văn Giang", limit: 10 },
  { title: "Còn phòng tại Seoul vào tháng tới", city: "Seoul", limit: 10 },
];

// ─── Sort Options ────────────────────────────────────────────────
export const SORT_OPTIONS = [
  { value: "rating_desc", label: "Đánh giá cao" },
  { value: "distance_asc", label: "Gần nhất", requiresLocation: true },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
  { value: "newest", label: "Mới nhất" },
];

// ─── Footer Navigation ──────────────────────────────────────────
export const FOOTER_LINKS = [
  {
    title: "Về chúng tôi",
    links: [
      { label: "Tuyển dụng", href: null },
      { label: "Tin tức", href: null },
      { label: "Nhà đầu tư", href: null },
      { label: "Booking BnB Plus", href: null },
    ],
  },
  {
    title: "Cộng đồng",
    links: [
      { label: "Sự đa dạng và Cảm giác thuộc về", href: null },
      { label: "Tiện nghi phù hợp cho người khuyết tật", href: null },
      { label: "Đối tác liên kết", href: null },
      { label: "Chỗ ở cho tuyến đầu", href: null },
    ],
  },
  {
    title: "Host",
    links: [
      { label: "Cho thuê nhà", href: "/host" },
      { label: "Cho thuê trải nghiệm", href: null },
      { label: "Tài nguyên cho Host", href: null },
      { label: "Diễn đàn cộng đồng", href: null },
    ],
  },
  {
    title: "Hỗ trợ",
    links: [
      { label: "Trung tâm trợ giúp", href: null },
      { label: "Hỗ trợ khu dân cư", href: null },
      { label: "Thông tin an toàn", href: null },
      { label: "Tùy chọn hủy", href: null },
    ],
  },
];

// ─── Search param keys ───────────────────────────────────────────
export const SEARCH_PARAM_KEYS = [
  "city",
  "min_price",
  "max_price",
  "guests",
  "bedrooms",
  "sort",
  "page",
  "limit",
  "property_type",
  "room_type",
  "lat",
  "lng",
  "radius_km",
];
