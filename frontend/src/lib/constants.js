/**
 * Các cấu hình dùng chung của giao diện Booking BnB.
 * Giá trị gửi lên API được giữ độc lập với khóa nội dung hiển thị.
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
  { key: "Căn hộ", labelKey: "categories.apartment", icon: "BuildingApartment" },
  { key: "Nhà", labelKey: "categories.house", icon: "HouseLine" },
  { key: "Khách sạn", labelKey: "categories.hotel", icon: "Buildings" },
  { key: "Villa", labelKey: "categories.villa", icon: "House" },
  { key: "Hanok", labelKey: "categories.hanok", icon: "Warehouse" },
  { key: "Nhà khách", labelKey: "categories.guesthouse", icon: "DoorOpen" },
  { key: "Phòng", labelKey: "categories.room", icon: "Bed" },
];

// ─── Homepage Section Configuration ──────────────────────────────
export const SECTION_CONFIG = [
  { titleKey: "home.suggested", limit: 12 },
  { titleKey: "home.popularHcm", city: "Hồ Chí Minh", limit: 10 },
  { titleKey: "home.popularHanoi", city: "Hà Nội", limit: 10 },
  { titleKey: "home.popularDanang", city: "Đà Nẵng", limit: 10 },
  { titleKey: "home.popularVangiang", city: "Văn Giang", limit: 10 },
  { titleKey: "home.popularSeoul", city: "Seoul", limit: 10 },
];

// ─── Sort Options ────────────────────────────────────────────────
export const SORT_OPTIONS = [
  { value: "rating_desc", labelKey: "search.sortRating" },
  { value: "distance_asc", labelKey: "search.sortDistance", requiresLocation: true },
  { value: "price_asc", labelKey: "search.sortPriceAsc" },
  { value: "price_desc", labelKey: "search.sortPriceDesc" },
  { value: "newest", labelKey: "search.sortNewest" },
];

// ─── Footer Navigation ──────────────────────────────────────────
export const FOOTER_LINKS = [
  {
    titleKey: "footer.about",
    links: [
      { labelKey: "footer.careers", href: null },
      { labelKey: "footer.news", href: null },
      { labelKey: "footer.investors", href: null },
      { labelKey: "footer.plus", href: null },
    ],
  },
  {
    titleKey: "footer.community",
    links: [
      { labelKey: "footer.diversity", href: null },
      { labelKey: "footer.accessibility", href: null },
      { labelKey: "footer.affiliates", href: null },
      { labelKey: "footer.frontline", href: null },
    ],
  },
  {
    titleKey: "footer.host",
    links: [
      { labelKey: "footer.listHome", href: "/host" },
      { labelKey: "footer.hostExperiences", href: null },
      { labelKey: "footer.hostResources", href: null },
      { labelKey: "footer.communityForum", href: null },
    ],
  },
  {
    titleKey: "footer.support",
    links: [
      { labelKey: "footer.helpCenter", href: null },
      { labelKey: "footer.neighborhoodSupport", href: null },
      { labelKey: "footer.safety", href: null },
      { labelKey: "footer.cancellation", href: null },
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
