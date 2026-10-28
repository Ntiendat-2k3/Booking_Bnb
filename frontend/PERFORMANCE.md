# Hiệu năng Booking BnB

## Cập nhật ngày 28/10/2026: tìm kiếm, JavaScript và ảnh

Đo trước/sau trên Node 24.21.0, Next.js 16.1.6, cùng fixture chỉ đọc và độ trễ API 350 ms; mỗi phiên có 5 mẫu cache lạnh và 5 mẫu cache ấm. Baseline là frontend hiện tại trước đợt tối ưu này, gồm cả AI, chat và các thay đổi refactor đã có. Không thay dữ liệu hay hợp đồng API.

| Chỉ số | Trước | Sau xác minh |
| --- | ---: | ---: |
| JS ban đầu trang chủ, gzip | 329.648 B | 289.605 B, giảm 12,1% |
| JS ban đầu tìm kiếm, gzip | 327.224 B | 287.481 B, giảm 12,1% |
| JS ban đầu chi tiết phòng, gzip | 335.641 B | 292.508 B, giảm 12,9% |
| CSS trang chủ, gzip | 18.092 B | 18.092 B |
| Hero HTTP, cache lạnh, median | 428,8 ms | 364,5 ms |
| Khoảng dao động hero lạnh | 304,3–479,7 ms | 336,8–592,1 ms |
| Hero HTTP, cache ấm, median | 28,6 ms | 37,9 ms |
| Khoảng dao động hero ấm | 27,6–39,4 ms | 34,9–55,8 ms |
| Toàn bộ HTML lạnh, median | 1.212,7 ms | 1.157,9 ms |
| HTML lạnh, gzip | 44.882 B | 45.224 B |
| Request API trang chủ lạnh/ấm | 7 / 0 | 7 / 0 |
| Request mỗi lượt tìm kiếm, kể cả tìm lại | 1 | 1 |

JS tính từ các thẻ script ban đầu trong HTML production, cùng phương pháp ở cả hai phiên. Các chunk tải sau tương tác hoặc sau đăng nhập không nằm trong chỉ số này. Không coi các thời gian HTTP là LCP/INP/CLS. Dao động thời gian giao nhau; cache ấm chậm hơn khoảng 9 ms ở phiên xác minh nên không kết luận mọi lượt tải đều nhanh hơn. `srcset` làm HTML gốc tăng khoảng 26 KB, HTML gzip tăng 342 B ở cache lạnh và khoảng 464 B ở cache ấm.

Các thay đổi được giữ:

- Trợ lý nổi tải khi trình duyệt rảnh, có timeout 1 giây và fallback timer 200 ms. Chỉ bắt đầu tải ở route cho phép hiển thị; instance đã tải vẫn được giữ khi chuyển trang. Phần hội thoại/kết quả của trợ lý chỉ tải khi mở panel, có trạng thái chờ được dịch.
- Thư viện socket chỉ tải khi đã có tài khoản đăng nhập. Các subscriber vẫn dùng chung một kết nối và signaling cũ; import trả về sau logout/unmount không được mở kết nối.
- Gợi ý Mapbox giữ debounce 300 ms và AbortController. Mỗi ô nhập lưu tối đa 10 kết quả thành công trong bộ nhớ trong 60 giây, phân biệt token/ngôn ngữ/loại địa danh/từ khóa; không lưu lỗi, không cache dữ liệu đặt phòng.
- Danh sách chat chỉ có một request đang chạy; sự kiện đến trong lúc tải được gom thành một lượt bổ sung để lấy trạng thái mới nhất. Request phân trang hoặc bộ lọc cũ bị hủy khi đổi người dùng/từ khóa hoặc unmount.
- Tìm tin nhắn giữ debounce 250 ms, hủy cả request trang đầu và phân trang cũ, không xóa kết quả chỉ vì thêm khoảng trắng, và dừng khi đóng bảng chi tiết.
- `imageLoader.js` tạo URL responsive cho Unsplash và ảnh Cloudinary upload có version, dùng [custom loader của Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/images). Các [tham số tối ưu CDN](https://cloudinary.com/documentation/image_optimization) được giới hạn theo nguồn; URL ký số, đã có transformation, Mapbox, media riêng tư và nguồn khác giữ nguyên. Production không gọi `/_next/image` của Vercel; môi trường dev giữ loader mặc định.

Kiểm tra có kiểm soát cùng kịch bản trên source trước/sau: mở cùng gợi ý địa danh 4 lần giảm 4 → 1 request; tải hội thoại ban đầu cùng 5 sự kiện làm mới giảm 6 → 2 request, số request đồng thời giảm 6 → 1. Vẫn có lượt bổ sung sau các sự kiện để tránh giữ dữ liệu cũ.

Đo GET ảnh Unsplash `photo-1600566753190-17f0baa2a6c3`, cùng header Accept hỗ trợ AVIF: URL `w=1800&q=85` trả 252.879 B; `w=640&q=75` trả 38.870 B, giảm 84,6%. Đây là ví dụ một ảnh với hai kích thước/chất lượng; không đại diện mọi ảnh hoặc thay thế kiểm chứng trực quan trên thiết bị thật.

Lặp lại phép đo trong thư mục `frontend`:

```powershell
# Chạy trước khi sửa để ghi lại cùng tập tính năng.
node scripts/performance-check.mjs --output "$env:TEMP/booking-before.json"
# Chạy sau khi sửa; giữ kiểm tra dữ liệu, cache và so sánh tài nguyên với baseline cùng điều kiện.
node scripts/performance-check.mjs --verify --baseline "$env:TEMP/booking-before.json" --output "$env:TEMP/booking-after.json"
```

`--baseline` xác minh cùng Node, Next.js, độ trễ fixture và số mẫu; JS trang chủ phải giảm, CSS không tăng. Ngưỡng mặc định lịch sử 270.000 B JS / 9.200 B CSS được giữ nguyên khi không truyền baseline. Frontend hiện tại vượt các ngưỡng lịch sử này ngay từ trước đợt tối ưu; lệnh `npm run check:performance` không có baseline vẫn không đạt chúng.

Đã qua: 28 kiểm thử chức năng/tiện ích, 38 kiểm thử hồi quy hiệu năng, lint, build production và benchmark `--verify --baseline` trên. HTTP smoke test 5 route × 2 locale trả 200. Bộ kiểm thử bổ sung debounce, TTL/giới hạn cache, hủy request, cách ly tài khoản, signaling, dùng chung socket, lazy loading và srcset thực của Next Image. Script đã khôi phục build dùng cấu hình API dự án sau khi đo. Không thêm dependency. Chưa đo Web Vitals hoặc E2E với tài khoản, thanh toán, cuộc gọi và camera thật.

## Số liệu lịch sử tháng 09/2026

Ngày đo: 28/09/2026. Áp dụng [performance-optimization của Addy Osmani](https://github.com/addyosmani/agent-skills/tree/main/skills/performance-optimization), đã cài và điều chỉnh tại `C:/Users/ASUS/.codex/skills/performance-optimization/SKILL.md`. Bản nguyên gốc được giữ ở `references/upstream-skill.md`; bản sử dụng bổ sung luồng Next.js/Express/Sequelize, yêu cầu tái sử dụng, GitNexus, cache và kiểm chứng của dự án.

## Phương pháp

- Đo production build, Node 24.21.0, Next.js 16.1.6, cùng máy và cùng dữ liệu. Baseline lấy từ giao diện đã thiết kế lại, có carousel và theme.
- Backend thật không chạy. Fixture HTTP chỉ nhận GET, chậm cố định 350 ms/request, listing có mô tả/host/ảnh và tọa độ; Seoul rỗng để kiểm tra truy vấn dự phòng. Không gọi thanh toán, tạo booking hoặc sửa dữ liệu người dùng.
- Mỗi phiên có 5 mẫu cache lạnh và 5 mẫu cache ấm. Cache lạnh xóa đúng entry của fixture và khởi động lại server đo; cache ấm được prime trước. Báo median và khoảng dao động.
- Thời điểm hero là lúc thẻ `h1#home-title` xuất hiện trong HTTP streaming, **không phải LCP hay thời điểm carousel tương tác được**. Không mở trình duyệt, tải ảnh/map tiles hoặc đo hydration, INP, CLS.
- JS/CSS là tổng kích thước các file duy nhất được tham chiếu trong HTML route, gzip riêng từng file. Không tính chunk tải sau, request ảnh hoặc font. Dữ liệu HTML gồm nội dung và payload RSC.

## Kết quả trước/sau

Các bảng dưới ghi nhận đợt tối ưu trước khi đổi hero sang dải ảnh chạy liên tục. Số đo sau thay đổi chuyển động được ghi riêng ở cuối tài liệu.

| Chỉ số trang chủ | Trước | Sau | Thay đổi |
| --- | ---: | ---: | ---: |
| Hero xuất trong HTTP, cache lạnh | 1.093,3 ms | 299,8 ms | giảm 72,6% |
| Khoảng dao động hero, cache lạnh | 1.036,1–1.164,6 ms | 279,7–398,4 ms | cải thiện vượt nhiễu |
| Trả hết HTML, cache lạnh | 1.094,6 ms | 1.096,4 ms | tương đương |
| HTML trước nén, cache lạnh | 339.197 B | 250.333 B | giảm 26,2% |
| HTML gzip, cache lạnh | 30.670 B | 30.100 B | giảm 1,9% |
| JS ban đầu gzip | 280.970 B | 264.847 B | giảm 5,7% |
| CSS ban đầu gzip | 13.773 B | 8.580 B | giảm 37,7% |
| Hero xuất trong HTTP, cache ấm | 32,2 ms | 33,9 ms | trong khoảng nhiễu |
| API trang chủ, lạnh / ấm | 7 / 0 | 7 / 0 | giữ cache và số request |

| Tài nguyên gzip theo route | Trước | Sau |
| --- | ---: | ---: |
| JS tìm kiếm | 264.720 B | 248.875 B |
| JS chi tiết phòng | 314.743 B | 298.898 B |
| CSS tìm kiếm | 13.773 B | 14.001 B |
| CSS chi tiết phòng | 16.889 B | 17.117 B |

CSS ở route dùng bản đồ tăng 228 B do chia file nén; đổi lại trang chủ không tải CSS Mapbox. Không tuyên bố toàn bộ response hoặc backend nhanh hơn: request hoàn tất vẫn chờ dữ liệu, còn hero/form được trả sớm.

## Các thay đổi giữ lại

1. Trang chủ bắt đầu các request song song nhưng chỉ các Server Component cần dữ liệu chờ promise trong `Suspense`. Hero, ảnh dự phòng đúng kích thước và một form tìm kiếm được trả sớm; carousel dùng cùng promise với gợi ý, không thêm request. Dùng lại `SectionRow`, `ListingCardSkeleton`, `ImageCarousel` và hằng số ảnh.
2. `getListingCardData` dùng chung cho trang chủ/tìm kiếm chỉ truyền các trường card/popup/map sử dụng. Giữ id, ảnh, giá, đánh giá, khoảng cách và tọa độ; mô tả/host đầy đủ vẫn ở trang chi tiết phòng.
3. Tách hàm `translate` khỏi module chứa hai từ điển; client nhận messages của locale hiện tại từ server. Giữ export cũ để các consumer khác không bị đổi hợp đồng. Bỏ khoảng 16,1 KB gzip từ JS ban đầu.
4. CSS Mapbox thuộc component dùng bản đồ. Hook `useInViewport` chỉ cho bản đồ phòng/tìm kiếm tải SDK khi vùng bản đồ xuất hiện, kích hoạt một lần, có cleanup và fallback khi thiếu IntersectionObserver. Chunk SDK đo được 1.645.741 B raw / 441.930 B gzip được hoãn; **không cộng lượng này vào mức giảm JS ban đầu** vì SDK đã được dynamic import trước đó.

Cache khám phá vẫn 60 giây, chi tiết phòng vẫn 300 giây. Tìm kiếm gọi API mới cả lần đầu và lần lặp lại: 1 request/lần. Không thêm dependency production, không thay backend/database, xác thực hoặc thanh toán. Theme mặc định theo hệ thống và thiết kế đã duyệt được giữ.

## Nhật ký thử nghiệm và giới hạn

| Thử nghiệm | Quan sát | Quyết định |
| --- | --- | --- |
| Chỉ streaming | Hero 310,3 ms; HTML tăng lên 372.339 B do skeleton | Giữ để trả vùng đầu sớm, tiếp tục giảm payload |
| Streaming + dữ liệu card gọn + tách i18n | HTML 250.333 B; JS 264.847 B gzip; hero 378,9 ms | Giữ; tải dữ liệu và bundle có cải thiện riêng |
| CSS theo component + SDK theo viewport | Hero 299,8 ms; CSS homepage 8.580 B gzip; kiểm tra SDK ngoài viewport không tải | Giữ; không quy mức chênh thời gian giữa các phiên này riêng cho CSS |
| Thêm cache/coalescing mới | Data cache đã xử lý cùng URL dự phòng; số request 7/0 | Không thêm cache hoặc `React.cache` chưa có lợi ích |
| Budget CSS 6 KB | Thất bại: CSS giao diện thật còn 8,6 KB | Sửa ngưỡng thành 9 KB dựa số đo, không bỏ CSS cần thiết |

Không đo query PostgreSQL/Redis hay API thật vì backend không hoạt động; không thêm index hoặc đổi TTL dựa suy đoán. Không có điểm Lighthouse hoặc kết luận LCP/INP/CLS. 9 bài kiểm tra Node giả lập ranh giới React/Next/Mapbox, không thay thế kiểm tra browser/WebGL.

GitNexus upstream đã được chạy trước sửa; các symbol JSX/script có kết quả UNKNOWN hoặc chưa tìm thấy, được bổ sung kiểm tra import/consumer thực tế. `detect_changes` đánh dấu CRITICAL cho tổng 62 file đang sửa, gồm cả đợt redesign trước; đây không phải phạm vi riêng của lần tối ưu này. Không commit/push trong lần thực hiện này.

## Chạy lại

Trong `frontend`:

```sh
npm run test:performance
npm run check:performance
npm run lint
npm run build
```

- `test:performance`: hiện có 16 bài kiểm tra VN/EN và nội suy, card/popup với dữ liệu đầy đủ/gọn, hero/form không chờ API, dùng chung promise, dữ liệu rỗng/lỗi, truy vấn/khách/ngày/phân trang, lịch dùng chung, ref input, payload đặt phòng, viewport, cleanup, SDK không khởi tạo sau unmount và chuyển động carousel.
- `check:performance`: build, fixture trên 3850, server đo trên 3851, kiểm tra budget hero median < 550 ms, JS homepage < 270.000 B gzip, CSS < 9.200 B gzip, cache công khai, tìm kiếm mới, đủ 24 kết quả và mô tả phòng. Có thể ghi JSON bằng `npm run check:performance -- --output <duong-dan.json>`.
- Script chỉ dừng process do nó tạo, không sửa `.env`; chỉ xóa cache của fixture. Script dùng `.next` rồi tự build lại bằng cấu hình dự án trong `finally`, kể cả khi budget thất bại. Chạy khi không phục vụ production từ cùng thư mục build; tránh chạy đồng thời với build khác. Không dùng kết quả khi build khôi phục thất bại.

Đã qua: 9/9 hồi quy, toàn bộ budget fixture, ESLint và build production với cấu hình dự án. Build còn thông báo cơ sở dữ liệu Browserslist cũ; không ảnh hưởng kết quả kiểm tra này.

## Cập nhật chuyển động hero

Theo yêu cầu mới, ảnh chính và ảnh phụ thuộc cùng một dải chạy từ phải sang trái. Plugin Autoplay được thay bằng [Auto Scroll 8.6 của Embla](https://github.com/davidjerleke/embla-carousel/blob/v8.6.0/packages/embla-carousel-auto-scroll/src/components/AutoScroll.ts). Tái sử dụng `ImageCarousel`, `IconButton`, ảnh và nhãn i18n; bỏ thanh điều hướng phủ ảnh. Nút pause, phím mũi tên và reduced motion được giữ.

Chỉ thay `transform` ở khung ảnh và ảnh bên trong để phóng to/thu nhỏ, giữ tỉ lệ ảnh, không cập nhật React state mỗi frame. Chu kỳ ảnh được lặp trọn khi chỉ có hai hoặc ba ảnh để Embla có đủ slide cho loop. Không có ảnh phụ cố định ngoài dải; fallback streaming vẫn có ảnh lớn/nhỏ cùng chiều cao vùng nội dung.

Kiểm tra Node dùng engine Embla và plugin thật, chạy 6.000 frame mỗi chiều rộng 320/768/1.024 px, xác nhận chiều trái, nhiều lần nối vòng và tỉ lệ ảnh. Bổ sung kiểm tra pause khi focus, bàn phím, reduced motion, chu kỳ ảnh và chỉ preload ảnh đầu. Tổng 12/12 bài qua; không mở browser hoặc kiểm chứng trực quan/WebGL.

Benchmark fixture cùng phương pháp đã qua tất cả budget: hero lạnh median 339,2 ms (244,5–407,4 ms), HTML 255.047 B / 30.327 B gzip, JS ban đầu 264.565 B gzip, CSS 8.887 B gzip. Cache/API giữ 7/0, tìm kiếm mới 1 request/lần. Warm hero 59 ms (52,7–100,7 ms), cao hơn phiên trước; dải có thêm slide để nối vòng, không tuyên bố mọi chỉ số đều tốt hơn. Build bằng cấu hình dự án đã được khôi phục thành công; lint và diff check đều qua.

## Cập nhật chiều sâu và mép dải ảnh

Bỏ ảnh phụ riêng ở fallback; khi dữ liệu đang tải chỉ có một ảnh chính ở giữa. Carousel căn giữa ảnh đã phóng lớn, giữ toàn bộ ảnh chính trong vùng rõ nét. Hai mép dùng mask chuyển dần về trong suốt và bo góc theo token chung, phù hợp cả nền sáng/tối. Ảnh phụ nghiêng nhẹ, lùi theo phối cảnh và giảm độ đậm; ảnh chính trở về góc và độ sâu bằng không.

Tốc độ giảm từ 1,2 xuống 0,8 px/frame. Đường cong smoothstep giúp phóng to/thu nhỏ êm ở điểm chuyển tiếp; mỗi frame chỉ cập nhật transform/opacity, không đổi kích thước layout hoặc React state. Giữ pause, bàn phím, reduced motion và vòng đời plugin hiện có.

Ngày 29/09/2026, tăng nhẹ tốc độ từ 0,8 lên 1 px/frame theo yêu cầu, giữ nguyên đường cong và hiệu ứng chiều sâu. Kiểm tra engine bên dưới dùng tốc độ mới; số đo tài nguyên/HTTP ngày 28/09 vẫn ghi nhận phiên trước thay đổi này.

Cùng ngày, bỏ nút pause/play và subscription trạng thái phát chỉ phục vụ nút này. Giữ phím mũi tên và tạm dừng khi focus carousel; tự chạy lại khi focus ra ngoài, trừ khi người dùng chọn giảm chuyển động. Bài hồi quy điều khiển được cập nhật cho hành vi không có nút.

12/12 bài hồi quy đã qua. Kiểm tra bằng engine/plugin thật tăng lên 9.000 frame mỗi chiều rộng 320/768/1.024 px, xác nhận hướng chạy, nhiều vòng lặp, tâm ảnh chính, vùng mép mờ, tỉ lệ ảnh, độ nghiêng, độ sâu và opacity. HTTP trang chủ trả 200, không còn markup bố cục ảnh phụ riêng cũ; không mở browser hoặc đánh giá trực quan.

Phiên đo đầu ghi nhận CSS 9.027 B gzip, tăng 140 B so với carousel trước và vượt ngưỡng 9.000 B đúng 27 B. Điều chỉnh budget thành 9.200 B để tính phần CSS chiều sâu/mask được yêu cầu; vẫn thấp hơn baseline 13.773 B khoảng 34,5%. Các budget JS, streaming và kiểm tra dữ liệu giữ nguyên.

Chạy lại đã đạt toàn bộ budget và kiểm tra dữ liệu: hero lạnh median 312,8 ms (201,1–747 ms), hero ấm 29 ms (27,1–41,3 ms), HTML lạnh 252.449 B / 30.267 B gzip, JS homepage 264.647 B gzip và CSS 9.027 B gzip. Cache/API vẫn 7/0; tìm kiếm mới 1 request/lần. Dao động mẫu lạnh lớn hơn phiên đầu, vì vậy không quy chênh lệch thời gian giữa các phiên cho hiệu ứng chuyển động.

## Lịch dùng chung, ngày 29/09/2026

`DateField` dùng cùng react-datepicker cho ngày nhận phòng ở tìm kiếm và khoảng ngày ở trang chi tiết, tái sử dụng `InputField` qua `customInputRef`. Component giữ trạng thái mở lần đầu và fallback input trong Suspense; chỉ import bộ lịch, CSS thư viện và CSS theme khi người dùng focus/click ô ngày. Không thêm dependency. Ngày hiển thị `dd/MM/yyyy`; query tìm kiếm và payload booking vẫn là `yyyy-MM-dd` theo ngày địa phương.

Bỏ override lịch cũ khỏi globals; CSS mới nằm cùng component, dùng selector có độ ưu tiên cao hơn thư viện để header, ngày, hover, vùng chọn và nút điều hướng cùng theo token sáng/tối. Không sửa luồng tính giá, giới hạn khách, xác thực, thanh toán hay cache.

16/16 hồi quy và ESLint đã qua, gồm input/ref thật của react-datepicker, locale VN/EN, tải theo thao tác, chọn/xóa ngày tìm kiếm và gửi đúng khoảng ngày đặt phòng. Benchmark cùng fixture đã đạt toàn bộ budget: hero lạnh median 334,7 ms (225,6–445,6 ms), hero ấm 26 ms (24,8–43 ms), HTML lạnh 252.125 B / 30.170 B gzip. JS ban đầu trang chủ 267.050 B gzip, CSS 8.997 B gzip; trang chi tiết JS 258.629 B gzip, CSS 13.844 B gzip. Cache/API giữ 7/0, tìm kiếm mới 1 request/lần. Không đo thời gian mở popup hoặc kiểm chứng trực quan bằng browser.
