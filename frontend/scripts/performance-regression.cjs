// Kiểm tra hành vi thật của vùng tải dữ liệu và bản đồ bằng Node, không cần trình duyệt hay API thật.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const React = require("react");
const babel = require("next/dist/compiled/babel/core");

const sourceRoot = path.resolve(__dirname, "../src");
const plain = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const tick = async () => { for (let index = 0; index < 12; index++) await Promise.resolve(); };

/** Biên dịch JSX bằng Babel đã có trong Next; chỉ giả lập các ranh giới framework và SDK. */
function createLoader(mocks = {}, globals = {}, imported = []) {
  const cache = new Map();
  function load(filename) {
    const target = [filename, filename + ".js", filename + ".jsx", path.join(filename, "index.jsx")].find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
    assert(target, `Không tìm thấy module kiểm thử: ${filename}`);
    if (cache.has(target)) return cache.get(target).exports;
    const loadedModule = { exports: {} };
    cache.set(target, loadedModule);
    if (target.endsWith(".json")) { loadedModule.exports = JSON.parse(fs.readFileSync(target, "utf8")); return loadedModule.exports; }
    const transformed = babel.transformSync(fs.readFileSync(target, "utf8"), {
      filename: target, babelrc: false, configFile: false,
      presets: [
        [require("next/dist/compiled/babel/preset-env"), { targets: { node: "12" }, modules: "commonjs" }],
        [require("next/dist/compiled/babel/preset-react"), { runtime: "automatic" }],
      ],
    }).code;
    const localRequire = (specifier) => {
      imported.push(specifier);
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier.startsWith("@phosphor-icons/react")) return new Proxy({}, { get: (_, name) => String(name) });
      if (specifier.endsWith(".css")) return {};
      if (specifier.startsWith("@/")) return load(path.join(sourceRoot, specifier.slice(2)));
      if (specifier.startsWith(".")) return load(path.resolve(path.dirname(target), specifier));
      return require(specifier);
    };
    vm.runInNewContext(transformed, { module: loadedModule, exports: loadedModule.exports, require: localRequire, console, process, URLSearchParams, queueMicrotask, ...globals }, { filename: target });
    return loadedModule.exports;
  }
  return (relative) => load(path.join(sourceRoot, relative));
}

function elements(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  return [node, ...elements(node.props?.children)];
}

function snapshot(node) {
  if (Array.isArray(node)) return node.map(snapshot);
  if (!node || typeof node !== "object") return node;
  if (!node.props) return plain(node);
  return {
    type: typeof node.type === "string" ? node.type : node.type?.name || String(node.type),
    props: Object.fromEntries(Object.entries(node.props).filter(([key, value]) => key !== "ref" && typeof value !== "function").map(([key, value]) => [key, key === "children" ? snapshot(value) : plain(value)])),
  };
}

/** Chạy lại hook với state/ref và vòng đời effect để kiểm tra chuyển trạng thái và hủy tải. */
function hookHarness() {
  const slots = [];
  let cursor = 0;
  let pending = [];
  const hooks = {
    ...React,
    useMemo: (factory) => factory(),
    useCallback: (callback) => callback,
    useState(initial) {
      const index = cursor++;
      slots[index] ||= { value: typeof initial === "function" ? initial() : initial };
      return [slots[index].value, (value) => { slots[index].value = typeof value === "function" ? value(slots[index].value) : value; }];
    },
    useRef(initial) { const index = cursor++; slots[index] ||= { current: initial }; return slots[index]; },
    useEffect(effect, dependencies) {
      const index = cursor++;
      const previous = slots[index];
      if (previous && dependencies.every((value, at) => Object.is(value, previous.dependencies[at]))) return;
      pending.push(() => { previous?.cleanup?.(); slots[index] = { dependencies, cleanup: effect() }; });
    },
  };
  return {
    hooks,
    render: (callback) => { cursor = 0; return callback(); },
    flush: () => { const work = pending; pending = []; work.forEach((effect) => effect()); },
    unmount: () => { slots.forEach((slot) => slot?.cleanup?.()); },
  };
}

const dataLoader = createLoader();
const { getListingCardData } = dataLoader("lib/listings.js");
const { getDictionary, createTranslator, translate } = dataLoader("i18n/config.js");
const constants = dataLoader("lib/constants.js");
const t = createTranslator("vn");
const listing = {
  id: "room-1", title: "Chỗ ở kiểm thử", city: "Hà Nội", country: "Việt Nam",
  price_per_night: 980000, avg_rating: "4.8", review_count: 14, distance_km: 0,
  lat: 0, lng: 0, images: [{ url: "https://images.unsplash.com/test" }],
  description: "Mô tả đầy đủ. ".repeat(200), host: { about: "Chủ nhà. ".repeat(200) },
};

test("Tách i18n giữ VN/EN, nội suy số 0 và hợp đồng export cũ", () => {
  for (const locale of ["vn", "en"]) {
    const dictionary = getDictionary(locale);
    assert.equal(createTranslator(locale)("home.title"), dictionary.home.title);
    assert.equal(translate(dictionary, "khong.ton.tai"), "khong.ton.tai");
  }
  assert.equal(translate({ text: "{count}/{missing}/{none}" }, "text", { count: 0, none: null }), "0/{missing}/{none}");
  const imports = [];
  createLoader({}, {}, imports)("i18n/LocaleProvider.jsx");
  assert(!imports.some((specifier) => specifier.endsWith(".json") || specifier === "./config"));
});

test("Dữ liệu gọn giữ nguyên card, popup, giá, ảnh và tọa độ; loại dữ liệu thừa", () => {
  const mocks = {
    "next/image": "Image", "next/link": "Link",
    "next/navigation": { useRouter: () => ({ push() {} }) },
    "react-redux": { useDispatch: () => () => {}, useSelector: (selector) => selector({ auth: { isInitialized: true } }) },
    "@/store/selectors": { selectAuthUser: () => null, selectFavoriteIdsSet: () => new Set() },
    "@/store/favoritesThunks": {}, "@/lib/notify": {},
    "@/i18n/LocaleProvider": { useLocale: () => ({ locale: "vn", t }) },
    "@/components/atoms/IconButton": "IconButton",
  };
  const load = createLoader(mocks);
  const Card = load("components/ListingCard.jsx").default;
  const Popup = load("components/Search/MapPopupCard.jsx").default;
  const lean = getListingCardData(listing);
  for (const Component of [Card, Popup]) assert.deepEqual(snapshot(Component({ listing })), snapshot(Component({ listing: lean })));
  assert.equal(lean.lat, 0);
  assert.equal(lean.lng, 0);
  assert.equal(lean.distance_km, 0);
  assert(Buffer.byteLength(JSON.stringify(lean)) < Buffer.byteLength(JSON.stringify(listing)) / 5);
  const legacy = { ...listing, id: undefined, listing_id: "legacy", price_per_night: undefined, price: 500000 };
  assert.deepEqual(snapshot(Card({ listing: legacy })), snapshot(Card({ listing: getListingCardData(legacy) })));
});

function pageMocks(serverGetJson) {
  return {
    "next/image": "Image", "@/components/SectionRow": "SectionRow",
    "@/components/Search/SearchPills": "SearchPills", "@/components/CategoryTabs": "CategoryTabs",
    "@/components/atoms/Button": "Button", "@/components/molecules/ImageCarousel": "ImageCarousel",
    "@/components/ListingCardSkeleton": "ListingCardSkeleton", "@/components/ListingCard": "ListingCard",
    "@/components/Search/SearchFilters": "SearchFilters", "@/components/Pagination": "Pagination",
    "@/components/Search/SearchResultsMap": "SearchResultsMap", "@/components/molecules/EmptyState": "EmptyState",
    "@/lib/serverApi": { serverGetJson }, "@/lib/seo": {},
    "@/i18n/server": { getServerTranslator: async () => ({ t }) },
  };
}

test("Hero và một form tìm kiếm xuất trước API; carousel dùng cùng promise gợi ý", async () => {
  const pending = [];
  const mocks = pageMocks((url, options) => new Promise((resolve) => pending.push({ url, options, resolve })));
  const Home = createLoader(mocks)("app/page.jsx").default;
  const tree = await Home();
  assert.equal(pending.length, constants.SECTION_CONFIG.length);
  assert(pending.every((request) => request.options.next.revalidate === 60));
  const nodes = elements(tree);
  assert.equal(nodes.filter((node) => node.type === "SearchPills").length, 1);
  assert(nodes.some((node) => node.type === "h1" && node.props.id === "home-title"));
  const hero = nodes.find((node) => node.type?.name === "HeroCarousel");
  const recommended = nodes.find((node) => node.type?.name === "HomeListingsSection" && node.props.itemsPromise);
  assert.equal(hero.props.itemsPromise, recommended.props.itemsPromise);
  const boundary = nodes.find((node) => node.type === React.Suspense && node.props.children === hero);
  const fallbackImage = elements(boundary.props.fallback).find((node) => node.type === "Image");
  assert.equal(elements(boundary.props.fallback).filter((node) => node.type === "Image").length, 1);
  assert.equal(fallbackImage.props.src, constants.SITE_IMAGES.exterior);
  assert.equal(fallbackImage.props.priority, true);
  pending.forEach((request) => request.resolve({ data: { items: [listing, listing] } }));
  const carousel = await hero.type(hero.props);
  assert.equal(carousel.props.sizes, fallbackImage.props.sizes);
  assert.equal(new Set(carousel.props.images.map((image) => image.src)).size, carousel.props.images.length);
  assert.equal((await recommended.type(recommended.props)).props.items.length, 2);
});

test("Thành phố rỗng dùng truy vấn dự phòng; lỗi API vẫn giữ hero và carousel", async () => {
  const calls = [];
  const load = createLoader(pageMocks(async (url) => {
    calls.push(url);
    const query = new URL(url, "http://fixture").searchParams;
    return { data: { items: query.has("city") ? [] : [listing] } };
  }));
  const nodes = elements(await load("app/page.jsx").default());
  const section = nodes.find((node) => node.type?.name === "HomeListingsSection" && node.props.collectionsPromise);
  const result = await section.type(section.props);
  assert(result.props.collections.every((collection) => collection.items.length === 1));
  assert.equal(calls.length, constants.SECTION_CONFIG.length + constants.SECTION_CONFIG.length - 1);
  const errorLoad = createLoader(pageMocks(async () => { throw new Error("API kiểm thử không khả dụng"); }), { console: { ...console, error() {} } });
  const failedTree = elements(await errorLoad("app/page.jsx").default());
  const hero = failedTree.find((node) => node.type?.name === "HeroCarousel");
  assert.equal((await hero.type(hero.props)).props.images.length, 2);
  assert(failedTree.some((node) => node.props?.id === "home-title"));
});

test("Tìm kiếm giữ ngày nhận phòng, khách, vị trí, phân trang và lấy API mới", async () => {
  const calls = [];
  const load = createLoader(pageMocks(async (...args) => { calls.push(args); return { data: { items: [listing], meta: { page: 2, total: 30 } } }; }));
  const query = { city: "Hà Nội", guests: "3", lat: "0", lng: "0", page: "2", check_in: "2026-12-01", check_out: "2026-12-04" };
  const Search = load("app/search/page.jsx").default;
  const nodes = elements(await Search({ searchParams: Promise.resolve(query) }));
  await Search({ searchParams: Promise.resolve(query) });
  assert.equal(calls.length, 2);
  assert(calls.every((call) => call.length === 1));
  const apiQuery = new URL(calls[0][0], "http://fixture").searchParams;
  for (const key of ["city", "guests", "lat", "lng", "page"]) assert.equal(apiQuery.get(key), query[key]);
  assert.equal(nodes.find((node) => node.type === "ListingCard").props.checkIn, query.check_in);
  assert.equal(nodes.find((node) => node.type === "ListingCard").props.checkOut, query.check_out);
  const map = nodes.find((node) => node.type === "SearchResultsMap");
  assert.equal(map.props.items[0].lat, 0);
  assert.equal(map.props.userLat, "0");
  assert(!Object.hasOwn(map.props.items[0], "host"));
  assert(!Object.hasOwn(nodes.find((node) => node.type === "Pagination").props.baseParams, "page"));
});

test("Ô lịch dùng chung định dạng, locale và chỉ tải bộ lịch khi mở", () => {
  for (const locale of ["vn", "en"]) {
    for (const selectsRange of [false, true]) {
      const harness = hookHarness();
      const imports = [];
      const DateField = createLoader({
        react: { ...harness.hooks, useId: () => "shared-date" },
        "@/components/atoms/InputField": "InputField",
        "@/i18n/LocaleProvider": { useLocale: () => ({ locale, t }) },
      }, {}, imports)("components/molecules/DateField.jsx").default;
      const startDate = new Date(2030, 9, 1);
      const endDate = new Date(2030, 9, 3);
      const change = () => {};
      const props = { label: "Ngày", selectsRange, selected: selectsRange ? undefined : startDate, startDate, endDate, minDate: startDate, onChange: change };
      const render = () => harness.render(() => DateField(props));
      const input = render();
      assert.equal(input.type, "InputField");
      assert.equal(input.props.value, selectsRange ? "01/10/2030 – 03/10/2030" : "01/10/2030");
      assert(!imports.some((name) => name.startsWith("react-datepicker") || name.endsWith("DateField.css")));
      input.props.onFocus();
      const opened = render();
      assert.equal(opened.type, React.Suspense);
      assert.equal(opened.props.fallback.props.id, input.props.id);
      const picker = opened.props.children;
      assert.equal(picker.props.dateFormat, "dd/MM/yyyy");
      assert.equal(picker.props.locale.code, locale === "en" ? "en-US" : "vi");
      assert.equal(picker.props.calendarClassName, "booking-calendar");
      assert.equal(picker.props.showPopperArrow, false);
      assert.equal(picker.props.selectsRange, selectsRange);
      assert.equal(picker.props.minDate, startDate);
      assert.equal(picker.props.onChange, change);
    }
  }
});

test("DatePicker thật truyền ref và sự kiện vào input dùng chung", () => {
  const DatePicker = require("react-datepicker").default;
  const harness = hookHarness();
  const Input = createLoader({ react: { ...harness.hooks, useId: () => "date-input" } })("components/atoms/InputField.jsx").default;
  const picker = new DatePicker({ ...DatePicker.defaultProps, id: "dates", customInputRef: "inputRef", customInput: React.createElement(Input, { label: "Ngày" }) });
  const customInput = picker.renderDateInput();
  const field = harness.render(() => Input(customInput.props));
  const nativeInput = elements(field).find((node) => node.type === "input");
  const nativeNode = { focus() {} };
  nativeInput.ref(nativeNode);
  assert.equal(picker.input, nativeNode);
  assert.equal(nativeInput.props.onFocus, picker.handleFocus);
  assert.equal(elements(field).find((node) => node.type === "label").props.htmlFor, "dates");
});

test("Lịch tìm kiếm giữ ngày ISO, địa điểm và số khách; xóa ngày không giữ query cũ", () => {
  const harness = hookHarness();
  const pushes = [];
  const Search = createLoader({
    react: { ...harness.hooks, useId: () => "destinations" },
    "next/navigation": { useRouter: () => ({ push: (url) => pushes.push(url) }) },
    "@/i18n/LocaleProvider": { useTranslations: () => t },
    "@/components/atoms/InputField": "InputField", "@/components/atoms/Button": "Button",
    "@/components/molecules/DateField": "DateField",
  })("components/Search/SearchPills.jsx").default;
  const render = () => harness.render(() => Search());
  const initial = elements(render());
  const destination = constants.POPULAR_DESTINATIONS[0];
  initial.find((node) => node.props?.name === "city").props.onChange({ target: { value: t(destination.labelKey) } });
  initial.find((node) => node.props?.name === "guests").props.onChange({ target: { value: "3" } });
  initial.find((node) => node.type === "DateField").props.onChange(new Date(2030, 9, 1));
  elements(render()).find((node) => node.props?.name === "check_out").props.onChange(new Date(2030, 9, 3));
  render().props.onSubmit({ preventDefault() {} });
  const query = new URL(pushes[0], "http://fixture").searchParams;
  assert.equal(query.get("check_in"), "2030-10-01");
  assert.equal(query.get("check_out"), "2030-10-03");
  assert.equal(query.get("city"), destination.value);
  assert.equal(query.get("guests"), "3");
  elements(render()).find((node) => node.type === "DateField").props.onChange(null);
  render().props.onSubmit({ preventDefault() {} });
  assert.equal(new URL(pushes[1], "http://fixture").searchParams.has("check_in"), false);
  assert.equal(new URL(pushes[1], "http://fixture").searchParams.has("check_out"), false);
});

test("Ngày nhận phòng mới xóa ngày trả phòng cũ không còn hợp lệ", () => {
  const harness = hookHarness();
  const Search = createLoader({
    react: { ...harness.hooks, useId: () => "destinations" },
    "next/navigation": { useRouter: () => ({ push() {} }) },
    "@/i18n/LocaleProvider": { useTranslations: () => t },
    "@/components/atoms/InputField": "InputField", "@/components/atoms/Button": "Button",
    "@/components/molecules/DateField": "DateField",
  })("components/Search/SearchPills.jsx").default;
  const fields = () => elements(harness.render(() => Search()));
  fields().find((node) => node.props?.name === "check_in").props.onChange(new Date(2030, 9, 1));
  fields().find((node) => node.props?.name === "check_out").props.onChange(new Date(2030, 9, 3));
  fields().find((node) => node.props?.name === "check_in").props.onChange(new Date(2030, 9, 4));
  assert.equal(fields().find((node) => node.props?.name === "check_out").props.selected, null);
});

test("Card giữ đủ hai ngày từ tìm kiếm đến trang chi tiết", () => {
  const Card = createLoader({
    "next/image": "Image", "next/link": "Link", "@/components/FavoriteButton": "FavoriteButton",
    "@/i18n/LocaleProvider": { useLocale: () => ({ locale: "vn", t }) },
  })("components/ListingCard.jsx").default;
  const links = elements(Card({ listing, checkIn: "2030-10-01", checkOut: "2030-10-03" })).filter((node) => node.type === "Link");
  assert.equal(links.length, 2);
  for (const link of links) {
    const url = new URL(link.props.href, "http://fixture");
    assert.equal(url.searchParams.get("check_in"), "2030-10-01");
    assert.equal(url.searchParams.get("check_out"), "2030-10-03");
  }
});

test("Nút yêu thích dùng chung giữ kiểm tra phiên, đồng bộ trạng thái và báo lỗi", async () => {
  let auth = { isInitialized: false, user: null };
  const favoriteIds = new Set([listing.id]);
  const requests = [], pushes = [], notices = [];
  let response = { ok: true, favorited: false };
  const FavoriteButton = createLoader({
    "next/navigation": { useRouter: () => ({ push: (url) => pushes.push(url) }) },
    "react-redux": { useSelector: (selector) => selector({ auth }), useDispatch: () => async (request) => { requests.push(request); return response; } },
    "@/store/selectors": { selectAuthUser: (state) => state.auth.user, selectFavoriteIdsSet: () => favoriteIds },
    "@/store/favoritesThunks": { toggleFavorite: (id) => id },
    "@/lib/notify": { notifyError: (message) => notices.push(message), notifySuccess: (message) => notices.push(message) },
    "@/i18n/LocaleProvider": { useTranslations: () => t }, "@/components/atoms/IconButton": "IconButton",
  })("components/FavoriteButton.jsx").default;
  const render = () => FavoriteButton({ listingId: listing.id });
  assert.equal(render().props.disabled, true);
  await render().props.onClick();
  assert.equal(requests.length, 0);
  auth = { isInitialized: true, user: null };
  await render().props.onClick();
  assert.deepEqual(pushes, ["/login"]);
  assert.equal(requests.length, 0);
  auth.user = { id: "guest" };
  assert.equal(render().props["aria-pressed"], true);
  await render().props.onClick();
  assert.deepEqual(requests, [listing.id]);
  assert.equal(notices.at(-1), t("listing.favoriteRemoved"));
  response = { ok: false, message: "Không thể lưu" };
  await render().props.onClick();
  assert.equal(notices.at(-1), response.message);
});

test("Đánh giá đã gửi thu gọn thành nhận xét và chỉ mở form khi chỉnh sửa", async () => {
  const harness = hookHarness();
  let review = null;
  const ReviewsSection = createLoader({
    react: harness.hooks,
    "@/services/reviewService": {
      getReviews: async () => ({ data: { items: review ? [review] : [], meta: { page: 1, limit: 6, total: review ? 1 : 0, total_pages: 1 } } }),
      getMyReview: async () => ({ data: { review, can_review: !review } }),
      createReview: async (_listingId, rating, comment) => {
        review = { id: "review-1", rating, comment };
        return { data: review };
      },
      updateReview: async (_reviewId, rating, comment) => {
        review = { ...review, rating, comment };
        return { data: review };
      },
      deleteReview: async () => ({ data: { ok: true } }),
    },
    "@/lib/notify": { notifyError: assert.fail, notifyInfo: assert.fail, notifySuccess: () => {} },
    "@/i18n/LocaleProvider": { useTranslations: () => t },
    "./Stars": { toInt: (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback },
    "./ReviewComposer": "ReviewComposer", "./ReviewList": "ReviewList",
  })("components/Reviews/index.jsx").default;
  const render = () => harness.render(() => ReviewsSection({ listingId: listing.id, initialCount: 0 }));
  const composer = () => elements(render()).find((node) => node.type === "ReviewComposer").props;

  render();
  harness.flush();
  await tick();
  composer().setComment("Chuyến đi rất tốt");
  await composer().submit();
  assert.equal(composer().mine.comment, "Chuyến đi rất tốt");
  assert.equal(composer().editing, false);

  const childHarness = hookHarness();
  const ReviewComposer = createLoader({
    react: childHarness.hooks,
    "next/link": "Link",
    "@/lib/notify": { notifyInfo: assert.fail },
    "@/i18n/LocaleProvider": { useTranslations: () => t },
    "@/components/atoms/Button": "Button", "./Stars": "Stars",
  })("components/Reviews/ReviewComposer.jsx").default;
  const view = () => elements(childHarness.render(() => ReviewComposer(composer())));
  assert.equal(view().some((node) => node.type === "textarea"), false);
  assert(view().some((node) => node.type === "Button" && node.props.children === t("common.edit")));

  composer().onEdit();
  assert.equal(view().find((node) => node.type === "textarea").props.value, "Chuyến đi rất tốt");
  composer().setComment("Đã sửa nhận xét");
  await composer().submit();
  assert.equal(composer().mine.comment, "Đã sửa nhận xét");
  assert.equal(composer().editing, false);
  assert.equal(view().some((node) => node.type === "textarea"), false);
});

test("Khoảng ngày lịch dùng chung giữ ngày đặt phòng và tính số đêm", async () => {
  const harness = hookHarness();
  const bookings = [], pushes = [];
  const Booking = createLoader({
    react: harness.hooks,
    "next/navigation": { useRouter: () => ({ push: (url) => pushes.push(url) }) },
    "react-redux": { useSelector: (selector) => selector({ auth: { user: { id: "guest" }, isInitialized: true } }) },
    "@/i18n/LocaleProvider": { useLocale: () => ({ locale: "vn", t }) },
    "@/services/bookingService": { createBooking: async (payload) => { bookings.push(payload); return { id: "booking" }; } },
    "@/lib/notify": { notifyError: (message) => assert.fail(message), notifyInfo: (message) => assert.fail(message) },
    "@/components/molecules/DateField": "DateField", "@/components/atoms/InputField": "InputField", "@/components/atoms/Button": "Button",
    "next/link": "Link",
  })("components/Booking/BookingCard.jsx").default;
  const render = () => harness.render(() => Booking({ listing: { ...listing, max_guests: 4 }, initialCheckIn: "2030-10-01" }));
  const dates = elements(render()).find((node) => node.type === "DateField");
  assert.equal(dates.props.selectsRange, true);
  dates.props.onChange([new Date(2030, 9, 1), new Date(2030, 9, 3)]);
  const nodes = elements(render());
  const { formatVND } = dataLoader("lib/format.js");
  assert(nodes.some((node) => node.props?.children === t("booking.nightsPrice", { price: formatVND(listing.price_per_night, "vi-VN"), count: 2 })));
  await nodes.find((node) => node.type === "Button").props.onClick();
  assert.deepEqual(plain(bookings), [{ listing_id: listing.id, check_in: "2030-10-01", check_out: "2030-10-03", guests_count: 1 }]);
  assert.deepEqual(pushes, ["/checkout/booking"]);
});

test("Lịch đặt phòng mobile nhận khoảng ngày URL và chặn ngày trả không hợp lệ", async () => {
  for (const initialCheckOut of ["2030-10-03", "2030-09-30", "không hợp lệ"]) {
    const harness = hookHarness();
    const errors = [], bookings = [];
    const Booking = createLoader({
      react: harness.hooks,
      "next/navigation": { useRouter: () => ({ push() {} }) },
      "react-redux": { useSelector: (selector) => selector({ auth: { user: { id: "guest" }, isInitialized: true } }) },
      "@/i18n/LocaleProvider": { useLocale: () => ({ locale: "vn", t }) },
      "@/services/bookingService": { createBooking: async (payload) => { bookings.push(payload); return { id: "booking" }; } },
      "@/lib/notify": { notifyError: (message) => errors.push(message) },
      "@/components/molecules/DateField": "DateField", "@/components/atoms/InputField": "InputField", "@/components/atoms/Button": "Button", "next/link": "Link",
    })("components/Booking/BookingCard.jsx").default;
    const render = () => harness.render(() => Booking({ listing: { ...listing, max_guests: 4 }, initialCheckIn: "2030-10-01", initialCheckOut }));
    const nodes = () => elements(render());
    await nodes().find((node) => node.type === "Button").props.onClick();
    if (initialCheckOut === "2030-10-03") {
      assert.equal(bookings[0].check_out, initialCheckOut);
      nodes().find((node) => node.props?.id === "booking-check-in").props.onChange(new Date(2030, 9, 4));
      assert.equal(nodes().find((node) => node.props?.id === "booking-check-out").props.selected, null);
      await nodes().find((node) => node.type === "Button").props.onClick();
      assert.equal(bookings.length, 1);
    } else assert.equal(bookings.length, 0);
    assert.equal(errors.at(-1), t("booking.datesRequired"));
  }
});

test("Observer chỉ kích hoạt một lần khi thấy phần tử và hủy callback sau unmount", () => {
  const observers = [];
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnects = 0; observers.push(this); }
    observe(element) { this.element = element; }
    disconnect() { this.disconnects++; }
  }
  const harness = hookHarness();
  const { useInViewport } = createLoader({ react: harness.hooks }, { IntersectionObserver: Observer })("hooks/useInViewport.js");
  const ref = { current: null };
  const render = () => harness.render(() => useInViewport(ref));
  render().viewportRef({ id: "map" });
  render(); harness.flush();
  assert.equal(observers[0].element, ref.current);
  observers[0].callback([{ isIntersecting: false }]);
  assert.equal(render().visible, false);
  observers[0].callback([{ isIntersecting: true }]);
  assert.equal(render().visible, true);
  harness.flush(); harness.unmount();
  assert(observers[0].disconnects > 0);
  const other = hookHarness();
  const otherHook = createLoader({ react: other.hooks }, { IntersectionObserver: Observer })("hooks/useInViewport.js").useInViewport;
  const otherRef = { current: null };
  const otherRender = () => other.render(() => otherHook(otherRef));
  otherRender().viewportRef({}); otherRender(); other.flush(); other.unmount();
  observers.at(-1).callback([{ isIntersecting: true }]);
  assert.equal(otherRender().visible, false);
});

test("Trình duyệt thiếu IntersectionObserver vẫn tải; microtask sau unmount bị bỏ", async () => {
  for (const cancelled of [false, true]) {
    const harness = hookHarness();
    const useInViewport = createLoader({ react: harness.hooks })("hooks/useInViewport.js").useInViewport;
    const ref = { current: null };
    const render = () => harness.render(() => useInViewport(ref));
    render().viewportRef({}); render(); harness.flush();
    if (cancelled) harness.unmount();
    await tick();
    assert.equal(render().visible, !cancelled);
    harness.unmount();
  }
});

for (const filename of ["components/MapboxStaticMap.jsx", "components/Search/SearchResultsMap.jsx"]) {
  test(`${filename}: không tải SDK ngoài viewport; hủy an toàn và không khởi tạo trùng`, async () => {
    for (const cancelled of [false, true]) {
      const harness = hookHarness();
      let visible = false, imports = 0, maps = 0, removals = 0;
      class Map {
        constructor(options) { maps++; assert.deepEqual(plain(options.center), [0, 0]); }
        addControl() {} on() {} remove() { removals++; }
      }
      class Marker { setLngLat() { return this; } addTo() { return this; } }
      const sdk = { Map, Marker, NavigationControl: class {} };
      const mocks = {
        react: harness.hooks, "mapbox-gl": { __esModule: true },
        "@/hooks/useInViewport": { useInViewport: (ref) => ({ visible, viewportRef: (node) => { ref.current = node; } }) },
        "@/i18n/LocaleProvider": { useLocale: () => ({ locale: "vn", t }), useTranslations: () => t },
        "./MapPopupCard": "MapPopupCard",
      };
      Object.defineProperty(mocks["mapbox-gl"], "default", { enumerable: true, get() { imports++; return sdk; } });
      const Component = createLoader(mocks, { process: { env: { NEXT_PUBLIC_MAPBOX_TOKEN: "fixture-token" } } })(filename).default;
      const props = { lat: 0, lng: 0, items: [listing], userLat: 0, userLng: 0 };
      const render = () => harness.render(() => Component(props));
      const tree = render();
      elements(tree).find((node) => node.ref)?.ref({});
      harness.flush(); await tick(); assert.equal(imports, 0);
      visible = true; render(); harness.flush();
      if (cancelled) harness.unmount();
      await tick();
      assert.equal(maps, cancelled ? 0 : 1);
      assert.equal(imports, 1);
      harness.unmount();
      assert.equal(removals, cancelled ? 0 : 1);
    }
  });
}

test("Carousel lặp nguyên chu kỳ ảnh, giữ ảnh phụ trong cùng dải và chỉ preload ảnh đầu", () => {
  for (const count of [1, 2, 3, 5]) {
    const harness = hookHarness();
    const options = [];
    const pluginOptions = [];
    const Component = createLoader({
      react: { ...harness.hooks, useSyncExternalStore: (_, getSnapshot) => getSnapshot() },
      "next/image": "Image", "@/components/atoms/IconButton": "IconButton",
      "@/i18n/LocaleProvider": { useTranslations: () => t },
      "embla-carousel-react": (configuration) => { options.push(configuration); return [() => {}, null]; },
      "embla-carousel-auto-scroll": (configuration) => { pluginOptions.push(configuration); return {}; },
    })("components/molecules/ImageCarousel.jsx").default;
    const images = Array.from({ length: count }, (_, index) => ({ src: `https://fixture/${index}`, alt: `Ảnh ${index}` }));
    const nodes = elements(harness.render(() => Component({ images, label: "Hero" })));
    const photos = nodes.filter((node) => node.type === "Image");
    assert.equal(photos.filter((node) => node.props.priority).length, 1);
    if (count > 1) {
      assert(photos.length >= 4);
      assert.equal(photos.length % count, 0);
      for (let index = 0; index < photos.length; index++) assert.equal(photos[index].props.src, images[index % count].src);
    }
    assert.equal(typeof options[0].align, "function");
    assert.equal(options[0].loop, true);
    assert.equal(pluginOptions[0].direction, "forward");
    assert.equal(pluginOptions[0].startDelay, 0);
    assert.equal(pluginOptions[0].active, count > 1);
    assert.equal(pluginOptions[0].breakpoints["(prefers-reduced-motion: reduce)"].active, false);
  }
});

test("Embla thật chạy sang trái qua nhiều vòng; ảnh luân phiên lớn/nhỏ và không kéo méo", () => {
  const Embla = require("embla-carousel");
  const originalObserver = global.IntersectionObserver;
  global.IntersectionObserver = class { observe() {} disconnect() {} };
  try {
    for (const viewportWidth of [320, 768, 1024]) {
      const gap = viewportWidth < 640 ? 12 : 16;
      const slotWidth = viewportWidth * 0.44 - gap / 2;
      const step = slotWidth + gap;
      const timers = [];
      const eventTarget = { addEventListener() {}, removeEventListener() {} };
      const ownerWindow = {
        ...eventTarget,
        matchMedia: () => ({ ...eventTarget, matches: false }),
        getComputedStyle: () => ({ getPropertyValue: () => String(gap) }),
        requestAnimationFrame: () => 1, cancelAnimationFrame() {},
        setTimeout: (callback) => { timers.push(callback); return timers.length; }, clearTimeout() {},
      };
      const ownerDocument = { ...eventTarget, defaultView: ownerWindow };
      const domNode = (offsetLeft, offsetWidth) => ({
        ...eventTarget, ownerDocument, offsetLeft, offsetWidth, offsetTop: 0, offsetHeight: 400,
        getAttribute: () => "", removeAttribute() {},
        style: { values: {}, setProperty(name, value) { this.values[name] = parseFloat(value); } },
      });
      const root = domNode(0, viewportWidth);
      const track = domNode(0, viewportWidth);
      root.children = [track]; track.parentElement = root;
      const slideNodes = Array.from({ length: 4 }, (_, index) => {
        const node = domNode(index * step, slotWidth);
        node.media = domNode(0, slotWidth * 1.4);
        node.querySelector = () => node.media;
        return node;
      });
      track.children = slideNodes;
      const harness = hookHarness();
      let api;
      const Component = createLoader({
        react: { ...harness.hooks, useSyncExternalStore: (_, getSnapshot) => getSnapshot() },
        "next/image": "Image", "@/components/atoms/IconButton": "IconButton",
        "@/i18n/LocaleProvider": { useTranslations: () => t },
        "embla-carousel-react": (options, plugins) => {
          api ||= Embla(root, { ...options, watchResize: false, watchSlides: false, watchFocus: false }, plugins);
          return [() => {}, api];
        },
      }, { window: ownerWindow })("components/molecules/ImageCarousel.jsx").default;
      harness.render(() => Component({ images: [{ src: "a", alt: "A" }, { src: "b", alt: "B" }], label: "Hero" }));
      harness.flush(); timers.forEach((callback) => callback());
      const engine = api.internalEngine();
      const initialLocation = engine.scrollSnaps[0];
      const primaryWidth = slideNodes[0].media.offsetWidth;
      assert(Math.abs(initialLocation + primaryWidth / 2 - viewportWidth / 2) < 1e-8);
      assert(initialLocation > viewportWidth * 0.1);
      assert(initialLocation + primaryWidth < viewportWidth * 0.9);
      assert.equal(engine.options.loop, true);
      assert.equal(slideNodes[0].media.style.values["--slide-scale-x"], 1);
      assert.equal(slideNodes[1].media.style.values["--slide-scale-x"], 3 / 7);
      const moveTo = (location) => {
        engine.location.set(location); engine.previousLocation.set(location); engine.target.set(location);
        engine.animation.render(1);
      };
      moveTo(initialLocation - step * 0.01);
      assert(1 - slideNodes[0].media.style.values["--slide-scale-x"] < 0.001);
      moveTo(initialLocation - step / 2);
      assert(Math.abs(slideNodes[0].media.style.values["--slide-scale-x"] - slideNodes[1].media.style.values["--slide-scale-x"]) < 1e-8);
      moveTo(initialLocation - step);
      assert.equal(slideNodes[1].media.style.values["--slide-scale-x"], 1);
      assert.equal(slideNodes[0].media.style.values["--slide-scale-x"], 3 / 7);
      moveTo(initialLocation);
      let wraps = 0;
      for (let frame = 0; frame < 9000; frame++) {
        const before = engine.location.get();
        engine.animation.update();
        assert(Math.abs(engine.location.get() - before + 1) < 1e-8);
        engine.animation.render(1);
        if (engine.location.get() > before) wraps++;
        for (const node of slideNodes) {
          const values = node.media.style.values;
          assert(values["--slide-scale-x"] >= 3 / 7 && values["--slide-scale-x"] <= 1);
          assert(Math.abs(values["--slide-scale-x"] * values["--cover-scale"] - values["--slide-scale-y"]) < 1e-8);
          assert(values["--slide-opacity"] >= 0.64 && values["--slide-opacity"] <= 1);
          assert(values["--slide-depth"] >= -56 && values["--slide-depth"] <= 0);
          assert(Math.abs(values["--slide-tilt"]) <= 8);
        }
      }
      assert(wraps >= 3);
      assert.equal(api.plugins().autoScroll.isPlaying(), true);
      harness.unmount();
      api.destroy();
      assert.equal(api.plugins().autoScroll.isPlaying(), false);
    }
  } finally {
    if (originalObserver === undefined) delete global.IntersectionObserver;
    else global.IntersectionObserver = originalObserver;
  }
});

test("Carousel không có nút điều khiển; focus tạm dừng, blur tiếp tục và giữ giảm chuyển động", () => {
  const harness = hookHarness();
  let playing = true, paused = 0, resumed = 0, previous = 0, next = 0, reduced = false;
  const autoScroll = { isPlaying: () => playing, stop: () => { paused++; playing = false; }, play: () => { resumed++; playing = true; } };
  const api = { plugins: () => ({ autoScroll }), selectedScrollSnap: () => 0, scrollPrev: () => previous++, scrollNext: () => next++ };
  const Component = createLoader({
    react: { ...harness.hooks, useSyncExternalStore: (_, getSnapshot) => getSnapshot() },
    "next/image": "Image", "@/components/atoms/IconButton": "IconButton",
    "@/i18n/LocaleProvider": { useTranslations: () => t },
    "embla-carousel-react": () => [() => {}, api], "embla-carousel-auto-scroll": () => ({}),
  }, { window: { matchMedia: () => ({ matches: reduced }) } })("components/molecules/ImageCarousel.jsx").default;
  const root = harness.render(() => Component({ images: [{ src: "a" }, { src: "b" }], label: "Hero" }));
  assert(!elements(root).some((node) => ["IconButton", "button", "Pause", "Play"].includes(node.type)));
  const region = { contains: (node) => node === region };
  root.props.onFocusCapture({ target: region, currentTarget: region });
  assert.equal(playing, false);
  assert.equal(paused, 1);
  root.props.onBlurCapture({ currentTarget: region, relatedTarget: region });
  assert.equal(resumed, 0);
  root.props.onBlurCapture({ currentTarget: region, relatedTarget: null });
  assert.equal(playing, true);
  assert.equal(resumed, 1);
  root.props.onKeyDown({ target: root, currentTarget: root, key: "ArrowLeft", preventDefault() {} });
  root.props.onKeyDown({ target: root, currentTarget: root, key: "ArrowRight", preventDefault() {} });
  assert.equal(previous, 1); assert.equal(next, 1);
  reduced = true;
  root.props.onBlurCapture({ currentTarget: region, relatedTarget: null });
  assert.equal(playing, false);
  assert.equal(resumed, 1);
});
