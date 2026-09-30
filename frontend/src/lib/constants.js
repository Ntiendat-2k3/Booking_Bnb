/**
 * Các cấu hình dùng chung của giao diện Booking BnB.
 * Giá trị gửi lên API được giữ độc lập với khóa nội dung hiển thị.
 */

// Thông tin nhận diện.
export const SITE_NAME = "Booking BnB";
export const SITE_DESCRIPTION =
  "Đặt phòng nhanh, tìm chỗ ở theo thành phố, giá, và vị trí gần bạn.";
export const SITE_LOCALE = "vi_VN";
export const SITE_LANG = "vi";
export const SITE_CURRENCY = "VND";

export const DEFAULT_THEME = "system";
export const THEME_OPTIONS = [
  { value: "system", labelKey: "theme.system" },
  { value: "light", labelKey: "theme.light" },
  { value: "dark", labelKey: "theme.dark" },
];

// Ảnh nhận diện được dùng lại giữa trang khám phá và các màn tài khoản.
export const SITE_IMAGES = {
  exterior: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1800&q=85",
  interior: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=85",
};

// Giá trị địa danh giữ nguyên theo API; nhãn hiển thị lấy từ từ điển.
export const POPULAR_DESTINATIONS = [
  { value: "Hà Nội", labelKey: "destinations.hanoi" },
  { value: "Hồ Chí Minh", labelKey: "destinations.hcm" },
  { value: "Đà Nẵng", labelKey: "destinations.danang" },
  { value: "Đà Lạt", labelKey: "destinations.dalat" },
  { value: "Vũng Tàu", labelKey: "destinations.vungtau" },
  { value: "Nha Trang", labelKey: "destinations.nhatrang" },
  { value: "Sapa", labelKey: "destinations.sapa" },
  { value: "Hội An", labelKey: "destinations.hoian" },
  { value: "Phú Quốc", labelKey: "destinations.phuquoc" },
  { value: "Ninh Bình", labelKey: "destinations.ninhbinh" },
  { value: "Vịnh Hạ Long", labelKey: "destinations.halong" },
  { value: "Quy Nhơn", labelKey: "destinations.quynhon" },
  { value: "Cần Thơ", labelKey: "destinations.cantho" },
  { value: "Huế", labelKey: "destinations.hue" },
];

// Loại chỗ ở.
export const CATEGORIES = [
  { key: "Căn hộ", labelKey: "categories.apartment", icon: "BuildingApartment" },
  { key: "Nhà", labelKey: "categories.house", icon: "HouseLine" },
  { key: "Khách sạn", labelKey: "categories.hotel", icon: "Buildings" },
  { key: "Villa", labelKey: "categories.villa", icon: "House" },
  { key: "Hanok", labelKey: "categories.hanok", icon: "Warehouse" },
  { key: "Nhà khách", labelKey: "categories.guesthouse", icon: "DoorOpen" },
  { key: "Phòng", labelKey: "categories.room", icon: "Bed" },
];

// Các khu vực khám phá trên trang chủ.
export const SECTION_CONFIG = [
  { titleKey: "home.suggested", limit: 4, layout: "grid" },
  { titleKey: "home.popularHcm", city: "Hồ Chí Minh", cityLabelKey: "destinations.hcm", limit: 10 },
  { titleKey: "home.popularHanoi", city: "Hà Nội", cityLabelKey: "destinations.hanoi", limit: 10 },
  { titleKey: "home.popularDanang", city: "Đà Nẵng", cityLabelKey: "destinations.danang", limit: 10 },
  { titleKey: "home.popularVangiang", city: "Văn Giang", cityLabelKey: "destinations.vangiang", limit: 10 },
  { titleKey: "home.popularSeoul", city: "Seoul", cityLabelKey: "destinations.seoul", limit: 10 },
];

// Các cách sắp xếp kết quả.
export const SORT_OPTIONS = [
  { value: "rating_desc", labelKey: "search.sortRating" },
  { value: "distance_asc", labelKey: "search.sortDistance", requiresLocation: true },
  { value: "price_asc", labelKey: "search.sortPriceAsc" },
  { value: "price_desc", labelKey: "search.sortPriceDesc" },
  { value: "newest", labelKey: "search.sortNewest" },
];

// Điều hướng cuối trang.
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

// Tham số được API tìm kiếm hỗ trợ.
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
