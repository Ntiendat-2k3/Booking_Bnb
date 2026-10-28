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
    useMemo(factory, dependencies) {
      const index = cursor++;
      const previous = slots[index];
      if (previous && dependencies?.every((value, at) => Object.is(value, previous.dependencies?.[at]))) return previous.value;
      const value = factory();
      slots[index] = { value, dependencies };
      return value;
    },
    useCallback(callback, dependencies) { return hooks.useMemo(() => callback, dependencies); },
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

test("Overlay cuộc gọi chỉ được nạp khi có cuộc gọi và vẫn giữ trạng thái kết thúc đến lúc đóng", () => {
  const harness = hookHarness();
  let listener;
  const Provider = createLoader({
    react: harness.hooks,
    "next/dynamic": () => "LazyCallOverlay",
    "react-redux": { useSelector: (selector) => selector({ auth: { user: { id: "user-1" } } }) },
    "../api/chatApi": { chatApi: {} },
    "./useChatSocket": { useChatSocket: (_, callback) => { listener = callback; } },
    "./useWebRTCCall": { useWebRTCCall: () => ({}) },
    "../utils/chatSounds": {},
  }, { crypto: { randomUUID: () => "instance-1" } })("features/chat/hooks/useCallSession.js").CallSessionProvider;
  const render = () => harness.render(() => Provider({ children: "Nội dung trang" }));
  let tree = render();
  assert.equal(tree.props.children[0], "Nội dung trang");
  assert(!elements(tree).some((node) => node.type === "LazyCallOverlay"));
  const call = { id: "call-1", caller_id: "user-2", callee_id: "user-1", status: "ringing", revision: 1 };
  listener("call:state", call);
  tree = render();
  assert.equal(elements(tree).find((node) => node.type === "LazyCallOverlay").props.session.call, call);
  listener("call:state", { ...call, status: "ended", revision: 2 });
  tree = render();
  const overlay = elements(tree).find((node) => node.type === "LazyCallOverlay");
  assert.equal(overlay.props.session.call.status, "ended");
  overlay.props.session.dismiss();
  assert(!elements(render()).some((node) => node.type === "LazyCallOverlay"));
});

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
    "@/components/Search/SearchResultsLayout": "SearchResultsLayout", "@/components/molecules/EmptyState": "EmptyState",
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
  const query = { city: "Hà Nội", guests: "3", lat: "0", lng: "0", map_lat: "21.0278", map_lng: "105.8342", page: "2", check_in: "2026-12-01", check_out: "2026-12-04" };
  const Search = load("app/search/page.jsx").default;
  const nodes = elements(await Search({ searchParams: Promise.resolve(query) }));
  await Search({ searchParams: Promise.resolve(query) });
  assert.equal(calls.length, 2);
  assert(calls.every((call) => call.length === 1));
  const apiQuery = new URL(calls[0][0], "http://fixture").searchParams;
  for (const key of ["city", "guests", "lat", "lng", "page"]) assert.equal(apiQuery.get(key), query[key]);
  assert.equal(apiQuery.has("map_lat"), false);
  assert.equal(apiQuery.has("map_lng"), false);
  const map = nodes.find((node) => node.type === "SearchResultsLayout");
  assert.equal(map.props.checkIn, query.check_in);
  assert.equal(map.props.checkOut, query.check_out);
  assert.equal(map.props.items[0].lat, 0);
  assert.equal(map.props.userLat, "0");
  assert.equal(map.props.mapLat, query.map_lat);
  assert.equal(map.props.mapLng, query.map_lng);
  assert(!Object.hasOwn(map.props.items[0], "host"));
  assert(!Object.hasOwn(map.props.pagination.props.baseParams, "page"));
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
  initial.find((node) => node.props?.name === "city").props.onChange(t(destination.labelKey));
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

test("Chọn gợi ý Mapbox chỉ dùng tọa độ để căn bản đồ, không đổi bộ lọc vị trí", () => {
  const harness = hookHarness();
  const pushes = [];
  const Search = createLoader({
    react: harness.hooks,
    "next/navigation": { useRouter: () => ({ push: (url) => pushes.push(url) }) },
    "@/i18n/LocaleProvider": { useTranslations: () => t },
    "@/components/atoms/InputField": "InputField", "@/components/atoms/Button": "Button",
    "@/components/molecules/DateField": "DateField",
  })("components/Search/SearchPills.jsx").default;
  const render = () => harness.render(() => Search());
  const cityField = () => elements(render()).find((node) => node.props?.name === "city");
  cityField().props.onChange("Hà Nội");
  cityField().props.onSelect({ city: "Hà Nội", lat: "21.0278", lng: "105.8342" });
  render().props.onSubmit({ preventDefault() {} });
  const selected = new URL(pushes[0], "http://fixture").searchParams;
  assert.equal(selected.get("city"), "Hà Nội");
  assert.equal(selected.get("map_lat"), "21.0278");
  assert.equal(selected.get("map_lng"), "105.8342");
  assert.equal(selected.has("lat"), false);
  assert.equal(selected.has("lng"), false);

  cityField().props.onChange("Đà Nẵng");
  render().props.onSubmit({ preventDefault() {} });
  const edited = new URL(pushes[1], "http://fixture").searchParams;
  assert.equal(edited.get("city"), "Đà Nẵng");
  assert.equal(edited.has("map_lat"), false);
  assert.equal(edited.has("map_lng"), false);
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
  const quote = { nights: [{ date: "2030-10-01", price_per_night: 980000 }, { date: "2030-10-02", price_per_night: 1200000 }], subtotal: 2180000, total: 2180000 };
  const Booking = createLoader({
    react: harness.hooks,
    "next/navigation": { useRouter: () => ({ push: (url) => pushes.push(url) }) },
    "react-redux": { useSelector: (selector) => selector({ auth: { user: { id: "guest" }, isInitialized: true } }) },
    "@/i18n/LocaleProvider": { useLocale: () => ({ locale: "vn", t }) },
    "@/services/bookingService": {
      createBooking: async (payload) => { bookings.push(payload); return { id: "booking" }; },
      getListingAvailability: async () => [],
      getListingQuote: async () => quote,
    },
    "@/components/Booking/PriceBreakdown": "PriceBreakdown",
    "@/lib/notify": { notifyError: (message) => assert.fail(message), notifyInfo: (message) => assert.fail(message) },
    "@/components/molecules/DateField": "DateField", "@/components/atoms/InputField": "InputField", "@/components/atoms/Button": "Button",
    "next/link": "Link",
  }, { AbortController })("components/Booking/BookingCard.jsx").default;
  const render = () => harness.render(() => Booking({ listing: { ...listing, max_guests: 4 }, initialCheckIn: "2030-10-01" }));
  const dates = elements(render()).find((node) => node.type === "DateField");
  harness.flush(); await tick();
  assert.equal(dates.props.selectsRange, true);
  dates.props.onChange([new Date(2030, 9, 1), new Date(2030, 9, 3)]);
  render(); harness.flush(); await tick();
  const nodes = elements(render());
  assert.deepEqual(plain(nodes.find((node) => node.type === "PriceBreakdown").props.quote), quote);
  assert.equal(nodes.find((node) => node.type === "Button").props.disabled, false);
  await nodes.find((node) => node.type === "Button").props.onClick();
  assert.deepEqual(plain(bookings), [{ listing_id: listing.id, check_in: "2030-10-01", check_out: "2030-10-03", guests_count: 1, expected_total: quote.total }]);
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
      "@/services/bookingService": {
        createBooking: async (payload) => { bookings.push(payload); return { id: "booking" }; },
        getListingAvailability: async () => [],
        getListingQuote: async () => ({ total: 1960000 }),
      },
      "@/lib/notify": { notifyError: (message) => errors.push(message) },
      "@/components/molecules/DateField": "DateField", "@/components/atoms/InputField": "InputField", "@/components/atoms/Button": "Button", "next/link": "Link",
    }, { AbortController })("components/Booking/BookingCard.jsx").default;
    const render = () => harness.render(() => Booking({ listing: { ...listing, max_guests: 4 }, initialCheckIn: "2030-10-01", initialCheckOut }));
    const nodes = () => elements(render());
    render(); harness.flush(); await tick();
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

test("Form phòng dùng chung giữ cập nhật địa chỉ, chọn tiện nghi bất biến và nạp lại phòng khác", () => {
  const harness = hookHarness();
  const { useListingForm } = createLoader({ react: harness.hooks })("features/hostListings/hooks/useListingForm.js");
  const form = () => harness.render(() => useListingForm());
  form().setField("title", "Room");
  form().setForm((previous) => ({ ...previous, address: "Address", lat: 0, lng: 0 }));
  assert.equal(form().form.title, "Room");
  assert.equal(form().form.lat, 0);
  const previous = form().picked;
  form().toggleAmenity("wifi");
  assert.equal(previous.size, 0);
  assert(form().picked.has("wifi"));
  form().toggleAmenity("wifi");
  assert.equal(form().picked.size, 0);
  form().resetForm({ title: "Other room", amenities: [{ id: "kitchen" }] });
  assert.equal(form().form.title, "Other room");
  assert.equal(form().form.address, "");
  assert.deepEqual([...form().picked], ["kitchen"]);
});

test("Chi tiết chuyến đi chỉ được tải khi mở và được đóng cùng trạng thái hỗ trợ truy cập", () => {
  const harness = hookHarness();
  const TripCard = createLoader({
    react: harness.hooks, "next/image": "Image", "next/dynamic": () => "TripBookingDetails",
    "@/i18n/LocaleProvider": { useLocale: () => ({ locale: "vn", t }) },
    "@/components/atoms/Badge": "Badge", "@/components/atoms/Button": "Button",
  })("features/trips/TripCard.jsx").default;
  const booking = { id: "trip", listing, status: "confirmed", check_in: "2030-10-01", check_out: "2030-10-03" };
  const render = () => elements(harness.render(() => TripCard({ booking, booker: { full_name: "Guest" }, busy: {} })));
  let nodes = render();
  assert(!nodes.some((node) => node.type === "TripBookingDetails"));
  const toggle = () => render().find((node) => node.props?.["aria-controls"] === "trip-details-trip");
  assert.equal(toggle().props["aria-expanded"], false);
  toggle().props.onClick();
  nodes = render();
  assert.equal(nodes.find((node) => node.type === "TripBookingDetails").props.booking, booking);
  assert.equal(toggle().props["aria-expanded"], true);
  toggle().props.onClick();
  assert(!render().some((node) => node.type === "TripBookingDetails"));
});

test("Ba chế độ lịch giữ cùng trạng thái, giá và sự kiện chọn ngày; không lọc lại khi đổi lựa chọn", () => {
  const harness = hookHarness();
  let filters = 0;
  const bookings = [{ id: "b", renter_name: "Guest", check_in: "2030-10-01", check_out: "2030-10-02", status: "confirmed" }];
  const originalFilter = bookings.filter;
  bookings.filter = function (...args) { filters++; return originalFilter.apply(this, args); };
  const selected = [];
  const Calendar = createLoader({ react: harness.hooks,
    "@/i18n/LocaleProvider": { useLocale: () => ({ locale: "en", t: createTranslator("en") }) },
  })("features/hostListings/components/HostCalendarDays.jsx").default;
  const props = { calendar: { bookings, pricing: { days: [{ date: "2030-10-01", price_per_night: 1200000 }] } },
    range: { start: new Date(2030, 9, 1), end: new Date(2030, 9, 3) }, anchor: new Date(2030, 9, 1),
    today: "2030-10-01", selectedDate: "2030-10-01", onSelect: (date) => selected.push(date) };
  for (const view of ["month", "week", "list"]) {
    const nodes = elements(harness.render(() => Calendar({ ...props, view })));
    const buttons = nodes.filter((node) => node.type === "button");
    assert.equal(buttons.length, 2);
    assert.equal(buttons[0].props["aria-pressed"], true);
    buttons[1].props.onClick();
    assert(nodes.some((node) => String(node.props?.children).includes("1,200,000")));
  }
  assert.deepEqual(selected, ["2030-10-02", "2030-10-02", "2030-10-02"]);
  assert.equal(filters, 2);
  harness.render(() => Calendar({ ...props, view: "month", selectedDate: "2030-10-02" }));
  assert.equal(filters, 2);
});

test("Camera QR dừng khi rời màn hình, kể cả khi quyền truy cập trả về muộn", async () => {
  for (const delayed of [false, true]) {
    const harness = hookHarness();
    let resolveMedia, stopped = 0, started = 0, frames = 0;
    const stream = { getTracks: () => [{ stop: () => stopped++ }] };
    const Scanner = createLoader({
      react: harness.hooks, "@/components/atoms/Button": "Button",
      "@/i18n/LocaleProvider": { useTranslations: () => t }, jsqr: () => null,
    }, { isSecureContext: true,
      navigator: { mediaDevices: { getUserMedia: () => delayed ? new Promise((resolve) => { resolveMedia = resolve; }) : Promise.resolve(stream) } },
      requestAnimationFrame: () => ++frames, cancelAnimationFrame() {},
    })("features/hostStays/StayQrScanner.jsx").default;
    const render = () => elements(harness.render(() => Scanner({ onStart: () => started++, onScan: () => assert.fail("Chưa quét QR") })));
    const nodes = render();
    nodes.find((node) => node.type === "video").ref.current = { play: async () => {}, srcObject: null };
    harness.flush();
    nodes.find((node) => node.type === "Button").props.onClick();
    await tick();
    if (!delayed) assert.equal(frames, 1);
    harness.unmount();
    if (delayed) { resolveMedia(stream); await tick(); assert.equal(frames, 0); }
    assert.equal(stopped, 1);
    assert.equal(started, 1);
  }
});

test("Camera QR chỉ chuyển token hợp lệ và dừng luồng trước khi xử lý booking", async () => {
  for (const token of ["A".repeat(43), "https://untrusted.example/qr"]) {
    const harness = hookHarness();
    let frame, stopped = 0;
    const scanned = [];
    const Scanner = createLoader({
      react: harness.hooks, "@/components/atoms/Button": "Button",
      "@/i18n/LocaleProvider": { useTranslations: () => t }, jsqr: () => ({ data: token }),
    }, { isSecureContext: true,
      navigator: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => stopped++ }] }) } },
      requestAnimationFrame: (callback) => { frame = callback; return 1; }, cancelAnimationFrame() {},
    })("features/hostStays/StayQrScanner.jsx").default;
    const render = () => elements(harness.render(() => Scanner({ onStart() {}, onScan: (value) => {
      assert.equal(stopped, 1); scanned.push(value);
    } })));
    const nodes = render();
    nodes.find((node) => node.type === "video").ref.current = { play: async () => {}, videoWidth: 640, videoHeight: 480 };
    nodes.find((node) => node.type === "canvas").ref.current = { getContext: () => ({ drawImage() {}, getImageData: () => ({ data: [] }) }) };
    harness.flush();
    nodes.find((node) => node.type === "Button").props.onClick();
    await tick();
    frame(200);
    assert.equal(stopped, 1);
    if (token.length === 43) assert.deepEqual(scanned, [token]);
    else {
      assert.equal(scanned.length, 0);
      assert(render().some((node) => node.props?.role === "alert" && node.props.children === t("stay.invalidQr")));
    }
    harness.unmount();
    assert.equal(stopped, 1);
  }
});

test("Gợi ý địa danh debounce khi gõ nhanh, tái dùng kết quả trong một phút và tách ngôn ngữ", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  const harness = hookHarness();
  let locale = "vn";
  const calls = [];
  const { useMapboxAutocomplete } = createLoader({ react: harness.hooks,
    "@/i18n/LocaleProvider": { useLocale: () => ({ locale }) },
  }, { AbortController, setTimeout, clearTimeout, Date,
    document: { addEventListener() {}, removeEventListener() {} },
    fetch: async (url, options) => {
      calls.push({ url, signal: options.signal });
      return { ok: true, json: async () => ({ features: [{ id: url }] }) };
    },
  })("hooks/useMapboxLocation.js");
  const options = { token: "fixture-token", minLength: 2, types: "place" };
  const render = () => harness.render(() => useMapboxAutocomplete(options));
  render(); harness.flush();
  render().setOpenSug(true);
  render().setQuery("Ha"); render(); harness.flush();
  context.mock.timers.tick(100);
  render().setQuery("Hanoi"); render(); harness.flush();
  context.mock.timers.tick(299);
  assert.equal(calls.length, 0);
  context.mock.timers.tick(1); await tick();
  assert.equal(calls.length, 1);
  assert.equal(render().suggestions.length, 1);
  for (let index = 0; index < 3; index++) {
    render().setOpenSug(false); render(); harness.flush();
    render().setOpenSug(true); render(); harness.flush(); await tick();
    context.mock.timers.tick(300); await tick();
  }
  assert.equal(calls.length, 1);
  locale = "en";
  assert.equal(render().suggestions.length, 0);
  harness.flush(); context.mock.timers.tick(300); await tick();
  assert.equal(calls.length, 2);
  assert.equal(new URL(calls[1].url).searchParams.get("language"), "en");
  context.mock.timers.tick(60000);
  render().setOpenSug(false); render(); harness.flush();
  render().setOpenSug(true); render(); harness.flush();
  context.mock.timers.tick(300); await tick();
  assert.equal(calls.length, 3);
  harness.unmount();
});

test("Gợi ý địa danh hủy request cũ, không hiện kết quả trễ và không cache lỗi", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const harness = hookHarness();
  const calls = [];
  const { useMapboxAutocomplete } = createLoader({ react: harness.hooks,
    "@/i18n/LocaleProvider": { useLocale: () => ({ locale: "vn" }) },
  }, { AbortController, setTimeout, clearTimeout,
    document: { addEventListener() {}, removeEventListener() {} },
    fetch: (url, options) => new Promise((resolve, reject) => calls.push({ url, signal: options.signal, resolve, reject })),
  })("hooks/useMapboxLocation.js");
  const render = () => harness.render(() => useMapboxAutocomplete({ token: "fixture", initialQuery: "Hanoi" }));
  render().setOpenSug(true); render(); harness.flush();
  context.mock.timers.tick(300);
  render().setQuery("Danang"); render(); harness.flush();
  assert.equal(calls[0].signal.aborted, true);
  context.mock.timers.tick(300);
  calls[0].resolve({ ok: true, json: async () => ({ features: [{ id: "stale" }] }) }); await tick();
  assert.equal(render().suggestions.length, 0);
  calls[1].reject(new Error("Mapbox unavailable")); await tick();
  assert.equal(render().suggestionError, true);
  render().setOpenSug(false); render(); harness.flush();
  render().setOpenSug(true); render(); harness.flush(); context.mock.timers.tick(300);
  assert.equal(calls.length, 3);
  harness.unmount();
  assert.equal(calls[2].signal.aborted, true);
});

test("Cache gợi ý địa danh có giới hạn và không chia sẻ token hoặc loại địa danh", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const harness = hookHarness();
  let count = 0;
  const { useMapboxAutocomplete } = createLoader({ react: harness.hooks,
    "@/i18n/LocaleProvider": { useLocale: () => ({ locale: "vn" }) },
  }, { AbortController, setTimeout, clearTimeout,
    document: { addEventListener() {}, removeEventListener() {} },
    fetch: async () => { count++; return { ok: true, json: async () => ({ features: [] }) }; },
  })("hooks/useMapboxLocation.js");
  let options = { token: "fixture", types: "place" };
  const render = () => harness.render(() => useMapboxAutocomplete(options));
  render().setOpenSug(true);
  for (let index = 0; index < 11; index++) {
    render().setQuery(`City${index}`); render(); harness.flush();
    context.mock.timers.tick(300); await tick();
  }
  render().setQuery("City0"); render(); harness.flush(); context.mock.timers.tick(300); await tick();
  assert.equal(count, 12);
  options = { ...options, token: "another-token" };
  render(); harness.flush(); context.mock.timers.tick(300); await tick();
  assert.equal(count, 13);
  options = { ...options, types: "address" };
  render(); harness.flush(); context.mock.timers.tick(300); await tick();
  assert.equal(count, 14);
  harness.unmount();
});

test("Tải hội thoại gom nhiều sự kiện thành một lượt bổ sung và hủy dữ liệu tài khoản/từ khóa cũ", async () => {
  const harness = hookHarness();
  const requests = [];
  const { useConversations } = createLoader({ react: harness.hooks,
    "../api/chatApi": { chatApi: { list: (params, signal) => new Promise((resolve, reject) => requests.push({ params, signal, resolve, reject })) } },
  }, { AbortController })("features/chat/hooks/useConversations.js");
  let userId = "guest-a", search = "";
  const render = () => harness.render(() => useConversations(userId, search));
  render(); harness.flush();
  for (let index = 0; index < 5; index++) void render().reload();
  assert.equal(requests.length, 1);
  requests[0].resolve({ items: [{ id: "first" }], hasMore: true }); await tick();
  assert.equal(requests.length, 2);
  requests[1].resolve({ items: [{ id: "fresh" }], hasMore: true }); await tick();
  assert.deepEqual(plain(render().items), [{ id: "fresh" }]);
  const more = render().loadMore();
  assert.equal(requests[2].params.page, 2);
  requests[2].resolve({ items: [{ id: "fresh" }, { id: "page2" }], hasMore: false });
  await more;
  assert.deepEqual(plain(render().items), [{ id: "fresh" }, { id: "page2" }]);
  void render().reload();
  userId = "guest-b";
  assert.equal(render().items.length, 0);
  harness.flush();
  assert.equal(requests[3].signal.aborted, true);
  requests[3].resolve({ items: [{ id: "private-a" }], hasMore: false }); await tick();
  assert.equal(render().items.length, 0);
  search = "Hanoi"; render(); harness.flush();
  assert.equal(requests[4].signal.aborted, true);
  requests[5].reject(new Error("Offline")); await tick();
  assert.equal(render().error.message, "Offline");
  void render().reload();
  requests[6].resolve({ items: [{ id: "guest-b-room" }], hasMore: false }); await tick();
  assert.equal(render().error, null);
  assert.deepEqual(plain(render().items), [{ id: "guest-b-room" }]);
  void render().reload(); harness.unmount();
  assert.equal(requests[7].signal.aborted, true);
});

test("Trợ lý AI chỉ tải khi rảnh, có fallback timer và giữ instance sau khi chuyển route", () => {
  for (const idle of [true, false]) {
    const harness = hookHarness();
    let pathname = "/login", task, cancelled = 0;
    const browser = { setTimeout: (callback) => { task = callback; return 1; }, clearTimeout: () => cancelled++ };
    if (idle) Object.assign(browser, { requestIdleCallback: (callback, options) => {
      assert.equal(options.timeout, 1000); task = callback; return 1;
    }, cancelIdleCallback: () => cancelled++ });
    const imports = [];
    const Launcher = createLoader({ react: harness.hooks, "next/dynamic": () => "FloatingAiAssistant",
      "next/navigation": { usePathname: () => pathname },
    }, { window: browser }, imports)("features/aiSearch/AiAssistantLauncher.jsx").default;
    const render = () => harness.render(() => Launcher());
    assert.equal(render(), null); harness.flush();
    assert.equal(task, undefined);
    pathname = "/"; render(); harness.flush();
    assert.equal(typeof task, "function");
    assert(!imports.includes("./FloatingAiAssistant"));
    task();
    assert.equal(render().type, "FloatingAiAssistant"); harness.flush();
    pathname = "/checkout/booking";
    assert.equal(render().props.hidden, true); harness.flush();
    pathname = "/search";
    assert.equal(render().props.hidden, false); harness.flush();
    assert.equal(cancelled, 1);
    harness.unmount();
  }
});

test("Realtime tải sau đăng nhập, dùng một socket và vẫn gửi/nhận signaling khi đổi subscriber", async () => {
  const first = hookHarness(), second = hookHarness();
  let currentHarness = first, userId;
  const connections = [], events = [], sent = [], imports = [];
  const runtime = { ...React };
  for (const name of ["useRef", "useState", "useEffect"]) runtime[name] = (...args) => currentHarness.hooks[name](...args);
  const hooks = createLoader({ react: runtime,
    "../api/chatApi": { chatApi: { socketTicket: async () => "ticket" } },
    "socket.io-client": { io: (url, options) => {
      const connection = { url, options, connected: false, handlers: {}, disconnects: 0,
        on(name, callback) { this.handlers[name] = callback; return this; },
        connect() { this.connected = true; this.handlers.connect?.(); },
        disconnect() { this.connected = false; this.disconnects++; },
        timeout() { return { emit: (event, payload, callback) => { sent.push({ event, payload }); callback(null, { ok: true }); } }; },
      };
      connections.push(connection); return connection;
    } },
  }, { window: { setTimeout, clearTimeout } }, imports)("features/chat/hooks/useChatSocket.js");
  const render = (harness, name) => { currentHarness = harness; return harness.render(() => hooks.useChatSocket(userId, (event) => events.push([name, event]))); };
  render(first, "first"); first.flush(); await tick();
  assert(!imports.includes("socket.io-client"));
  assert.equal(connections.length, 0);
  userId = "guest";
  render(first, "first"); first.flush();
  render(second, "second"); second.flush(); await tick();
  assert.equal(connections.length, 1);
  connections[0].handlers["chat:message"]({ sender_id: "other" });
  assert(events.some(([name, event]) => name === "first" && event === "chat:message"));
  assert(events.some(([name, event]) => name === "second" && event === "chat:message"));
  await hooks.emitChatSocket("webrtc:offer", { call_id: "call", description: "offer" });
  assert.deepEqual(plain(sent), [{ event: "webrtc:offer", payload: { call_id: "call", description: "offer" } }]);
  first.unmount();
  assert.equal(connections[0].disconnects, 0);
  second.unmount();
  assert.equal(connections[0].disconnects, 1);
  await assert.rejects(hooks.emitChatSocket("webrtc:offer", {}));
});

test("Import realtime trả về muộn không mở socket sau logout hoặc unmount", async () => {
  const harness = hookHarness();
  let userId = "guest-a", created = 0;
  const { useChatSocket } = createLoader({ react: harness.hooks,
    "../api/chatApi": { chatApi: {} }, "socket.io-client": { io: () => { created++; return {}; } },
  })("features/chat/hooks/useChatSocket.js");
  const render = () => harness.render(() => useChatSocket(userId));
  render(); harness.flush();
  userId = undefined;
  render(); harness.flush(); await tick();
  assert.equal(created, 0);
  userId = "guest-b";
  render(); harness.flush(); harness.unmount(); await tick();
  assert.equal(created, 0);
});

test("Tìm tin nhắn debounce và hủy cả phân trang cũ khi người dùng đổi từ khóa", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const harness = hookHarness();
  const requests = [];
  const messageState = { items: [], reload() {}, receive() {}, receiveUpdate() {}, receiveReaction() {} };
  const View = createLoader({ react: harness.hooks, "next/link": "Link", "next/image": "Image", "next/dynamic": () => "Proposal",
    "@/components/atoms/IconButton": "IconButton", "@/i18n/LocaleProvider": { useLocale: () => ({ t }) },
    "../hooks/useCallSession": { useCallSession: () => ({}) }, "../hooks/useMessages": { useMessages: () => messageState },
    "../hooks/useChatSocket": { useChatSocket: () => true },
    "./MessageBubble": "MessageBubble", "./MessageComposer": "MessageComposer", "./ChatAvatar": "ChatAvatar", "./EmojiText": "EmojiText",
    "../api/chatApi": { chatApi: { pinnedMessages: async () => [], publicProfile: async () => ({}),
      searchMessages: (id, search, page, signal) => new Promise((resolve) => requests.push({ id, search, page, signal, resolve })),
    } },
  }, { AbortController, window: { setTimeout, clearTimeout }, document: { addEventListener() {}, removeEventListener() {} } })("features/chat/components/ConversationView.jsx").default;
  const props = { conversation: { id: "conversation", other_id: "other", other_name: "Other" }, userId: "guest", onActivity() {} };
  const render = () => elements(harness.render(() => View(props)));
  render(); harness.flush(); await tick();
  render().find((node) => node.type === "IconButton" && node.props.label === t("chat.details")).props.onClick();
  render(); harness.flush(); await tick();
  render().find((node) => node.type === "button" && elements(node).some((child) => child.props?.children === t("chat.panel.search"))).props.onClick();
  render(); harness.flush();
  const input = () => render().find((node) => node.props?.id === "chat-content-search");
  input().props.onChange({ target: { value: "old" } }); render(); harness.flush();
  context.mock.timers.tick(250);
  requests[0].resolve({ items: [{ id: "old-1" }], page: 1, hasMore: true }); await tick();
  render().find((node) => node.type === "button" && node.props.children === t("chat.loadMore")).props.onClick();
  assert.equal(requests[1].page, 2);
  input().props.onChange({ target: { value: "new" } }); render(); harness.flush();
  assert.equal(requests[0].signal.aborted, true);
  assert.equal(requests[1].signal.aborted, true);
  requests[1].resolve({ items: [{ id: "stale-page-2" }], page: 2, hasMore: false }); await tick();
  context.mock.timers.tick(249);
  assert.equal(requests.length, 2);
  context.mock.timers.tick(1);
  requests[2].resolve({ items: [{ id: "fresh" }], page: 1, hasMore: false }); await tick();
  const nodes = render();
  assert(nodes.some((node) => node.key === "fresh"));
  assert(!nodes.some((node) => node.key === "stale-page-2" || node.key === "old-1"));
  input().props.onChange({ target: { value: "new " } }); render(); harness.flush();
  context.mock.timers.tick(250);
  assert.equal(requests.length, 3);
  assert(render().some((node) => node.key === "fresh"));
  render().find((node) => node.type === "IconButton" && node.props.label === t("chat.closeDetails")).props.onClick();
  render(); harness.flush();
  assert.equal(requests[2].signal.aborted, true);
  harness.unmount();
  assert.equal(requests[2].signal.aborted, true);
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
        "next-themes": { useTheme: () => ({ resolvedTheme: "light" }) },
        "@/hooks/useInViewport": { useInViewport: (ref) => ({ visible, viewportRef: (node) => { ref.current = node; } }) },
        "@/i18n/LocaleProvider": { useLocale: () => ({ locale: "vn", t }), useTranslations: () => t },
        "./MapPopupCard": "MapPopupCard",
      };
      Object.defineProperty(mocks["mapbox-gl"], "default", { enumerable: true, get() { imports++; return sdk; } });
      const colors = { canvas: "247 244 237", surface: "255 253 248", positive: "47 106 79", accent: "34 55 39", line: "223 221 210", "muted-surface": "239 235 225", ink: "29 40 28", "muted-ink": "91 101 89" };
      const Component = createLoader(mocks, {
        process: { env: { NEXT_PUBLIC_MAPBOX_TOKEN: "fixture-token" } },
        getComputedStyle: () => ({ getPropertyValue: (name) => colors[name.replace("--color-", "")] || "" }),
      })(filename).default;
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

test("Card và bản đồ đồng bộ hover, chọn phòng mà vẫn giữ link chi tiết riêng", () => {
  const harness = hookHarness();
  let compact = false;
  const Layout = createLoader({
    react: harness.hooks,
    "@/components/ListingCard": "ListingCard",
    "./SearchMapPanel": "SearchMapPanel",
  }, { window: { matchMedia: () => ({ matches: compact }) } })("components/Search/SearchResultsLayout.jsx").default;
  const render = () => elements(harness.render(() => Layout({ items: [listing] })));
  let nodes = render();
  nodes.find((node) => node.type === "ListingCard").props.onMapHover(listing.id);
  nodes = render();
  assert.equal(nodes.find((node) => node.type === "SearchMapPanel").props.hoveredId, listing.id);
  nodes.find((node) => node.type === "SearchMapPanel").props.onMarkerSelect(listing.id);
  nodes = render();
  assert.equal(nodes.find((node) => node.type === "ListingCard").props.mapHighlighted, true);
  nodes.find((node) => node.type === "ListingCard").props.onMapSelect(listing.id);
  nodes = render();
  const map = nodes.find((node) => node.type === "SearchMapPanel");
  assert.equal(map.props.selectedId, listing.id);
  assert.equal(map.props.focusRequest.sequence, 1);
  compact = true;
  nodes.find((node) => node.type === "ListingCard").props.onMapSelect(listing.id);
  assert.equal(render().find((node) => node.type === "SearchMapPanel").props.expanded, true);
});

test("Camera và khoảng đệm bản đồ theo desktop, tablet, mobile", () => {
  const { getSearchMapCameraProfile, getSearchMapFitPadding, getSearchMapFocusOffset, canUseMobileBuildings } = dataLoader("components/Search/searchMapCamera.js");
  for (const [width, pitch, buildingZoom, duration] of [[1280, 30, 14, 600], [800, 25, 15, 500], [390, 18, 16, 350]]) {
    const profile = getSearchMapCameraProfile(width);
    assert.equal(profile.pitch, pitch);
    assert.equal(profile.buildingZoom, buildingZoom);
    assert.equal(profile.duration, duration);
  }
  const portrait = { clientWidth: 360, clientHeight: 600 };
  const landscape = { clientWidth: 800, clientHeight: 400 };
  assert(getSearchMapFitPadding(portrait).top > getSearchMapFitPadding(portrait).bottom);
  assert.equal(getSearchMapFocusOffset(portrait, true)[1], -140);
  assert(getSearchMapFocusOffset(landscape, true)[0] > 0);
  assert.equal(canUseMobileBuildings({ deviceMemory: 2, hardwareConcurrency: 8 }), false);
  assert.equal(canUseMobileBuildings({ deviceMemory: 8, hardwareConcurrency: 8, connection: { saveData: true } }), false);
});

test("Marker giữ giá đầy đủ và đổi 2D/3D không tạo lại map hoặc ghim", async () => {
  const harness = hookHarness();
  let mapCount = 0, markerCount = 0, removedMarkers = 0;
  let reducedMotion = false;
  let resolvedTheme = "light";
  let currentZoom = 11, currentPitch = 0, isMoving = false, now = 0, resizeCount = 0;
  let resizeObserver;
  const windowListeners = {}, frames = [];
  const browser = {
    innerWidth: 1280,
    navigator: { deviceMemory: 8, hardwareConcurrency: 8, connection: { saveData: false } },
    matchMedia: () => ({ matches: reducedMotion }),
    addEventListener(name, listener) { windowListeners[name] = listener; },
    removeEventListener(name) { delete windowListeners[name]; },
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    cancelAnimationFrame() {},
    performance: { now: () => now },
  };
  class ResizeObserver {
    constructor(callback) { this.callback = callback; resizeObserver = this; }
    observe() {}
    disconnect() {}
  }
  const flushResize = () => { resizeObserver.callback(); frames.shift()?.(); };
  const markerElements = [];
  const camera = [], configurations = [];
  let map;
  class Element {
    constructor() {
      this.dataset = {};
      this.listeners = {};
      this.children = [];
      this.clientWidth = 360;
      this.clientHeight = 520;
      this.classList = { toggle() {} };
    }
    append(child) { this.children.push(child); }
    addEventListener(name, listener) { this.listeners[name] = listener; }
    setAttribute(name, value) { this[name] = value; }
  }
  class Map {
    constructor(options) {
      mapCount++;
      this.options = options;
      this.config = { ...options.config.basemap };
      this.listeners = {};
      this.touchZoomRotate = { disableRotation: () => { this.touchRotationDisabled = true; } };
      this.keyboard = { disableRotation: () => { this.keyboardRotationDisabled = true; } };
      map = this;
    }
    addControl() {}
    on(name, listener) { this.listeners[name] = listener; }
    off(name, listener) { if (this.listeners[name] === listener) delete this.listeners[name]; }
    isStyleLoaded() { return true; }
    getConfigProperty(_, name) { return this.config[name]; }
    setConfigProperty(...args) { configurations.push(args); this.config[args[1]] = args[2]; }
    getZoom() { return currentZoom; }
    getPitch() { return currentPitch; }
    getBearing() { return 0; }
    isMoving() { return isMoving; }
    resize() { resizeCount++; }
    easeTo(options) {
      camera.push(options);
      if (options.zoom !== undefined) currentZoom = options.zoom;
      if (options.pitch !== undefined) currentPitch = options.pitch;
    }
    fitBounds(_, options) { this.fitOptions = options; }
    remove() { this.removed = true; }
  }
  class Marker {
    constructor({ element }) { this.element = element; markerElements.push(element); markerCount++; }
    setLngLat() { return this; }
    addTo() { return this; }
    remove() { removedMarkers++; }
  }
  const colors = { canvas: "247 244 237", surface: "255 253 248", positive: "47 106 79", accent: "34 55 39", line: "223 221 210", "muted-surface": "239 235 225", ink: "29 40 28", "muted-ink": "91 101 89" };
  const sdk = { Map, Marker, NavigationControl: class {} };
  const Component = createLoader({
    react: harness.hooks,
    "mapbox-gl": { __esModule: true, default: sdk },
    "next-themes": { useTheme: () => ({ resolvedTheme }) },
    "@/hooks/useInViewport": { useInViewport: (ref) => ({ visible: true, viewportRef: (node) => { ref.current = node; } }) },
    "@/i18n/LocaleProvider": { useLocale: () => ({ locale: "vn", t }) },
    "@/components/atoms/Button": "Button",
    "./MapPopupCard": "MapPopupCard",
  }, {
    process: { env: { NEXT_PUBLIC_MAPBOX_TOKEN: "fixture-token" } },
    document: { createElement: () => new Element() },
    window: browser,
    ResizeObserver,
    getComputedStyle: () => ({ colorScheme: resolvedTheme, getPropertyValue: (name) => colors[name.replace("--color-", "")] || "" }),
  })("components/Search/SearchResultsMap.jsx").default;
  let props = { items: [listing], onMarkerHover: (id) => { props = { ...props, hoveredId: id }; }, onMarkerSelect: (id) => { props = { ...props, selectedId: id }; } };
  const render = () => {
    const tree = harness.render(() => Component(props));
    elements(tree).find((node) => node.ref)?.ref({});
    return elements(tree);
  };
  render(); harness.flush(); await tick();
  map.listeners.load();
  render(); harness.flush(); await tick();
  assert.equal(mapCount, 1);
  assert.equal(markerCount, 1);
  map.listeners.error();
  assert.equal(render().some((node) => node.props?.role === "alert"), false);
  assert(map.options.style.includes("standard"));
  assert.equal(map.options.pitch, 0);
  assert.equal(map.options.bearing, 0);
  assert.equal(map.options.dragRotate, false);
  assert.equal(map.options.touchPitch, false);
  assert.equal(map.touchRotationDisabled, true);
  assert.equal(map.keyboardRotationDisabled, true);
  assert.equal(map.fitOptions.retainPadding, false);
  assert(map.fitOptions.padding.top > map.fitOptions.padding.bottom);
  const price = dataLoader("lib/format.js").formatVND(listing.price_per_night);
  assert.equal(map.options.config.basemap.colorLand, "rgb(247, 244, 237)");
  assert.equal(map.options.config.basemap.lightPreset, "day");
  assert.equal(map.options.config.basemap.colorPlaceLabels, "rgb(91, 101, 89)");
  assert.equal(markerElements[0].children[0].textContent, price);
  assert.match(price, /980.000/);
  markerElements[0].children[0].listeners.pointerenter();
  render(); harness.flush();
  assert.equal(markerCount, 1);
  assert.equal(markerElements[0].children[0].dataset.hovered, "true");
  markerElements[0].children[0].listeners.click({ preventDefault() {}, stopPropagation() {} });
  assert.equal(camera.at(-1).center[0], listing.lng);
  assert.equal(camera.at(-1).center[1], listing.lat);
  assert.equal(camera.at(-1).zoom, 15);
  assert(camera.at(-1).offset[1] < 0);
  let nodes = render(); harness.flush();
  assert.equal(markerElements[0].children[0].dataset.selected, "true");
  assert.equal(nodes.find((node) => node.type === "MapPopupCard").props.listing.id, listing.id);
  assert.equal(markerCount, 1);
  let toggle = nodes.find((node) => node.type === "Button" && node.props["aria-pressed"] === false);
  toggle.props.onClick();
  nodes = render(); harness.flush();
  assert.equal(nodes.find((node) => node.type === "Button").props["aria-pressed"], true);
  assert.equal(camera.at(-1).pitch, 30);
  assert.equal(camera.at(-1).duration, 600);
  assert(configurations.some((entry) => entry[1] === "show3dObjects" && entry[2] === true));
  assert.equal(map.config.show3dBuildings, true);
  currentZoom = 13;
  map.listeners.zoom();
  assert.equal(map.config.show3dBuildings, false);
  currentZoom = 14;
  map.listeners.zoom();
  assert.equal(map.config.show3dBuildings, true);
  toggle = nodes.find((node) => node.type === "Button");
  toggle.props.onClick();
  render(); harness.flush();
  assert.equal(camera.at(-1).pitch, 0);
  browser.innerWidth = 800;
  flushResize();
  assert.equal(currentPitch, 0);
  render().find((node) => node.type === "Button").props.onClick();
  render(); harness.flush();
  assert.equal(currentPitch, 25);
  assert.equal(camera.at(-1).duration, 500);
  assert.equal(map.config.show3dBuildings, false);
  currentZoom = 15;
  map.listeners.zoom();
  assert.equal(map.config.show3dBuildings, true);
  map.listeners.dragstart({ originalEvent: {} });
  browser.innerWidth = 390;
  flushResize();
  assert.equal(currentPitch, 25);
  map.listeners.moveend();
  assert.equal(currentPitch, 18);
  assert.equal(camera.at(-1).duration, 350);
  assert.equal(map.config.show3dBuildings, false);
  currentZoom = 16;
  map.listeners.zoom();
  assert.equal(map.config.show3dBuildings, true);
  isMoving = true;
  for (let index = 0; index < 15; index++) { now += 60; map.listeners.render(); }
  isMoving = false;
  assert.equal(map.config.show3dBuildings, false);
  assert.equal(currentPitch, 18);
  browser.innerWidth = 844;
  flushResize();
  assert.equal(currentPitch, 25);
  browser.innerWidth = 390;
  flushResize();
  assert.equal(currentPitch, 18);
  reducedMotion = true;
  render().find((node) => node.type === "Button").props.onClick();
  render(); harness.flush();
  assert.equal(camera.at(-1).duration, 0);
  assert.equal(resizeCount, 4);
  resolvedTheme = "dark";
  Object.assign(colors, { canvas: "18 27 21", surface: "29 40 31", positive: "144 216 174", accent: "182 203 149", line: "58 70 56", "muted-surface": "36 49 38", ink: "244 240 228", "muted-ink": "180 187 172" });
  render(); harness.flush();
  assert(configurations.some((entry) => entry[1] === "colorLand" && entry[2] === "rgb(18, 27, 21)"));
  assert(configurations.some((entry) => entry[1] === "lightPreset" && entry[2] === "night"));
  assert(configurations.some((entry) => entry[1] === "colorPlaceLabels" && entry[2] === "rgb(180, 187, 172)"));
  assert.equal(mapCount, 1);
  assert.equal(markerCount, 1);
  map.setConfigProperty = () => { throw new Error("3D unavailable"); };
  render().find((node) => node.type === "Button").props.onClick();
  assert.equal(render().some((node) => node.type === "Button"), false);
  assert.equal(currentPitch, 0);
  harness.unmount();
  assert.equal(map.removed, true);
  assert.equal(removedMarkers, 1);
});

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
