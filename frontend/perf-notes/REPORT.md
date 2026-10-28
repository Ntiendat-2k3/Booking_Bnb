# Báo cáo tối ưu frontend

## Tóm tắt

Đã tối ưu trên nhánh `perf/frontend-optimization`, chỉ thay file trong `frontend/`, không push. Checkpoint `fc36836` giữ nguyên công việc đã có từ hai lượt trước; toàn bộ số liệu dưới đây so với checkpoint đó, không cộng lại mức giảm của các lượt trước.

Phiên bản thực tế: Next 16.1.6, React/React DOM 18.3.1, Tailwind 3.4.19, Redux Toolkit 2.11.2. Không nâng framework, không thêm production dependency. Chỉ thêm devDependency được cho phép `@next/bundle-analyzer@16.1.6`.

- JS ban đầu giảm trên cả **24/24 route**, khoảng **951–1264 byte gzip/route**. Mức giảm nhỏ và có số đo thật, không tuyên bố giảm cả package Mapbox khỏi build.
- LCP mobile lab median: home **9.16 → 8.42 s**, search **7.39 → 5.98 s**; room **5.68 → 5.87 s**, chưa có cải thiện đáng tin cậy ở room. TBT giảm trên ba route; CLS vẫn dưới 0.1.
- **Chưa đạt LCP ≤ 2.5 s. INP không đo được** bằng navigation Lighthouse; TBT chỉ là chỉ báo lab, không thay cho kết luận INP ≤ 200 ms.
- Giữ giao diện, font, cache nghiệp vụ và API; giữ nguyên mã tạo booking, giá, tồn phòng, token/JWT/OAuth, Stripe/VNPay. Phản hồi tim dùng state hiển thị cục bộ, kết quả Redux/API vẫn quyết định trạng thái thật.
- Đã có cổng lint, test, test:performance, production build cho từng Phase. Chi tiết exit code nằm trong `phase-0-checks.json` đến `phase-9-checks.json`. Bộ cuối có **28 unit + 39 performance test**.

## Bảng số liệu trước/sau

Đo production Turbopack với fixture GET có độ trễ 350 ms, Lighthouse 12.8.2/Chrome headless, profile mobile mặc định, 3 mẫu/route, profile trình duyệt mới và prime cache server trước mỗi lần. Không đo bằng dev, không sử dụng tài khoản/booking thật, không đo bản deploy. Xem [AUDIT.md](AUDIT.md), [measurements-summary.json](measurements-summary.json) và các JSON `before/after-home/search/room-1/2/3.json` để tái kiểm tra.

| Route | JS ban đầu gzip trước → sau | LCP median trước → sau | TBT median trước → sau | CLS median trước → sau |
| --- | ---: | ---: | ---: | ---: |
| `/` | 289605 → 288485 B | 9160 → 8424 ms | 239 → 206.5 ms | 0.0091 → 0.0091 |
| `/search` | 287481 → 286530 B | 7385 → 5976 ms | 231 → 158 ms | 0 → 0 |
| `/rooms/[id]` | 292508 → 291468 B | 5683 → 5873 ms | 304 → 238 ms | 0 → 0 |
| `/checkout/[id]` | 277670 → 276425 B | Không đo có ý nghĩa khi thiếu phiên/booking thật | Không đo | Không đo |

Khoảng LCP giữa 3 mẫu: home 8881–9636 → 7828–8921 ms; search 7322–7392 → 5962–6481 ms; room 5680–7650 → 5769–6875 ms. Không quy mức tăng nhỏ của room thành bằng chứng hồi quy do preload, cũng không tuyên bố room nhanh hơn. Các mẫu ít và cùng một máy không đại diện p75 người dùng thật.

Next 16 không in bảng First Load JS kiểu cũ. Số JS thay thế được cộng từ các script URL trong HTML và byte gzip của đúng file production, bao gồm script nomodule, cùng phương pháp trước/sau. Đây không phải tổng mọi chunk tải sau tương tác và không đồng nhất với byte truyền mạng của Lighthouse. Toàn bộ route đều HTTP 200; protected route chỉ xác nhận shell, không xác nhận chức năng sau đăng nhập.

| Route | Trước (B gzip) | Sau (B gzip) | Giảm (B) |
| --- | ---: | ---: | ---: |
| `/account/settings` | 270896 | 269651 | 1245 |
| `/ai-search` | 284145 | 283043 | 1102 |
| `/auth/callback` | 255580 | 254335 | 1245 |
| `/auth/qr/approve` | 256414 | 255169 | 1245 |
| `/checkout/[id]` | 277670 | 276425 | 1245 |
| `/favorites` | 262115 | 261010 | 1105 |
| `/forgot-password` | 257720 | 256475 | 1245 |
| `/host/calendar` | 279120 | 277875 | 1245 |
| `/host/dashboard` | 268049 | 266841 | 1208 |
| `/host/listings/[id]` | 279226 | 277962 | 1264 |
| `/host/listings/new` | 272159 | 270895 | 1264 |
| `/host/listings` | 257243 | 255998 | 1245 |
| `/host` | 275752 | 274507 | 1245 |
| `/host/stays` | 273234 | 271989 | 1245 |
| `/login` | 270773 | 269528 | 1245 |
| `/messages/[conversationId]` | 283546 | 282301 | 1245 |
| `/messages` | 283546 | 282301 | 1245 |
| `/` | 289605 | 288485 | 1120 |
| `/profile` | 260946 | 259701 | 1245 |
| `/register` | 264751 | 263506 | 1245 |
| `/reset-password` | 260788 | 259543 | 1245 |
| `/rooms/[id]` | 292508 | 291468 | 1040 |
| `/search` | 287481 | 286530 | 951 |
| `/trips` | 279176 | 277931 | 1245 |

Nguồn: [route-comparison.json](route-comparison.json). So sánh toàn bộ 24 route và kiểm tra không có delta dương đã chạy thành công. Bảng là baseline → kết quả tổng, không phải đo riêng từng tối ưu.

Bằng chứng bổ sung:

- Sprite mascot là LCP của home/search trong baseline. Median resource-load-delay home **889 → 19 ms**, search **651 → 19 ms**; hint chỉ ở route hiển thị widget, ưu tiên Low, không đổi thời điểm mở widget. LCP vẫn phụ thuộc tải/render JS; preload không giải quyết hết.
- CSS transfer của mẫu Lighthouse đầu: search **24212 → 18950 B**, room **24212 → 17916 B**. Home **18864 → 18871 B**, tăng 7 B. [initial-map-css.json](initial-map-css.json) xác nhận CSS Mapbox không còn trong stylesheet ban đầu của home/search/room; bản đồ thật vẫn xuất hiện trong kiểm tra trình duyệt.
- Analyzer dùng Webpack chỉ để chẩn đoán cùng phương pháp: chart.js parsed bytes **193496 → 189280 B** sau bỏ Legend không dùng. Không lấy output Webpack so trực tiếp với route JS Turbopack. Top 10 package/chunk trước/sau: [baseline-analyzer-summary.json](baseline-analyzer-summary.json), [after-analyzer-summary.json](after-analyzer-summary.json).
- Trình duyệt desktop: 24 card; hover đầu cập nhật 1 card, chuyển hover cập nhật 2 card theo React commit hook; không đo thời lượng render từ hook này. Card rộng 243.7 px dùng nguồn ảnh 256 px. Link chi tiết giữ đủ check-in/check-out; gallery và giá trị ô ngày hiển thị đúng dữ liệu fixture. Xem [browser-regression.json](browser-regression.json).

## Các thay đổi theo Phase

| Phase | File/commit chính | Lý do |
| --- | --- | --- |
| 0 | `next.config.js`, package/lock, scripts đo và perf-notes; `6410906` | Gộp analyzer có điều kiện, giữ config cũ, ghi baseline và kiểm kê thật |
| 1 | `components/organisms/RevenueChart.jsx`; `52ffc0d` | Bỏ import/registration Legend vì chart luôn tắt legend |
| 2 | `lib/loadMapbox.js`, ba component Mapbox, `features/chat/hooks/useCallSession.js`; `a620ed6` | Nạp CSS cùng SDK trước khi tạo map; chỉ tải overlay khi có cuộc gọi, giữ nguyên signaling/media/action |
| 3 | ListingCard/SearchResultsLayout, AiAssistantLauncher/FloatingAiAssistant, mascotAssets; `3911619` | Khai báo sizes theo lưới, preload sprite LCP bằng URL dùng chung |
| 4 | Ghi chú và các cổng kiểm tra; `e5b91f9` | Font local và swap đã đúng; không đổi family/weight/UI |
| 5 | Ghi chú và các cổng kiểm tra; `0ae7ae9` | Không có tracking script ngoài cần hoãn; giữ JSON-LD, Stripe/OAuth |
| 6 | `app/host/dashboard/page.jsx`; `f5dd5fb` | Fallback biểu đồ giữ đúng 300 px như nội dung thật |
| 7 | ListingCard, SearchResultsLayout, FavoriteButton và test hồi quy; `6e46fd0` | Memo/callback ổn định, tái dùng selector boolean sẵn có, phản hồi tim và rollback |
| 8 | Ghi chú và các cổng kiểm tra; `a8d612a` | Room đã là Server Component; giữ TTL và các boundary dữ liệu riêng/tồn phòng/giá |
| 9 | Báo cáo, số đo sau, guard lỗi Lighthouse | Đối chiếu 24 route, 9 mẫu Lighthouse sau, kiểm tra trình duyệt, khôi phục build production cấu hình thật |

Ghi chú chi tiết: `PHASE-1.md` đến `PHASE-8.md`. GitNexus upstream impact đã chạy trước các thay đổi symbol; phần lớn trả LOW và không nhận đủ cạnh JSX, nên đã bổ sung kiểm tra import/caller thực tế. detect_changes được chạy trước từng commit; không coi thiếu cạnh là không có ảnh hưởng.

## Đã bỏ qua và lý do

- Không đổi Stripe/VNPay, OAuth/auth, tạo booking, API/backend hoặc cache tồn phòng/giá. Đây là điều kiện dừng của brief. Chưa chạy giao dịch hoặc đăng nhập thật.
- Không thêm useDeferredValue/useTransition/virtualization khi chưa có danh sách lọc client lớn cần xử lý. Search phân trang 24 item, lọc theo form submit. Autocomplete đã debounce 300 ms, abort request cũ và cache có giới hạn; giữ nguyên thay vì chồng timer.
- Không gỡ production dependency: package lớn đều có caller, dynamic import hoặc CSS sử dụng. Không nâng Browserslist/framework chỉ để xóa cảnh báo tuổi dữ liệu.
- Font đã dùng next/font/local với WOFF2 và swap, không có Google Fonts link cần chuyển. Gallery/card/map đã giữ kích thước. Gallery chi tiết có autoplay/thumbnails nên giữ lazy browser, không làm trống ảnh khi tự chuyển.
- Custom CDN loader đã có trong checkpoint, giữ nguyên theo yêu cầu không đổi loader. Nếu dùng tối ưu ảnh mặc định Next/Vercel sau này phải xét hạn mức theo gói.
- Không chuyển reviews sang server/cache công khai: có quyền sửa/xóa theo người dùng. Không đổi revalidate 300 giây của room thành ví dụ 60 giây.
- `npm ci` ban đầu lỗi EPERM native SWC trên Windows; đã khôi phục bằng install với lockfile hiện có, đối chiếu phiên bản và chạy được toàn bộ cổng. Chi tiết ở AUDIT.
- Lần Lighthouse sau đầu tiên có 9 lỗi kết nối Chrome debug trong sandbox, không đưa vào số đo. Chạy lại ngoài sandbox thành công 9/9. Guard đo hiện trả exit code lỗi nếu CLI/runtimeError thất bại. Xem [lighthouse-run-notes.json](lighthouse-run-notes.json).
- `check:performance` với budget lịch sử 270000 B JS không chạy lại trong Phase 9; JS baseline hiện tại đã cao hơn ngưỡng này. Không nâng/xóa budget để tạo kết quả xanh. Phép đo 24 route so cùng baseline xác nhận không tăng JS; đây không phải tuyên bố đã đạt budget cũ.

## Rủi ro/điều cần người kiểm tra lại

| Checklist hồi quy | Bằng chứng và giới hạn |
| --- | --- |
| Home, ảnh, lưới | Test dữ liệu và trình duyệt; mobile ảnh dưới fold chưa tải là lazy như dự kiến. Có tràn ngang 4 px tại viewport 390 px; chưa có DOM baseline cùng viewport để kết luận hồi quy, không sửa layout ngoài task |
| Tìm kiếm/lọc | Test query ngày/khách/tiện ích và luồng danh sách/map; trình duyệt giữ 24 card, highlight và link ngày. Fixture không mô phỏng đầy đủ kết quả lọc API thật |
| Chi tiết phòng | Mô tả/ảnh/ngày qua test và trình duyệt; map search có canvas thật. Test viewport/camera/marker/address vẫn xanh |
| Giá/phòng trống | Chưa xác nhận API thật; fixture không hỗ trợ CORS cho request client availability/quote |
| Checkout Stripe/VNPay | Chưa E2E với booking/payment thật; mã không sửa |
| Login thường/Google OAuth | Chưa E2E thật; test guard phiên hiện có xanh, mã auth không sửa |
| Favorites/Trips/Reviews | Test hiện có và test tim pending/success/rollback xanh; chưa E2E tài khoản thật |
| Host tạo/sửa/upload | Test form/address/upload hiện có xanh; chưa E2E host thật |
| Console/hydration | Không quan sát hydration warning/page exception trong kiểm tra; console fixture có lỗi CORS/HTTP ở auth/view/quote/review-mine, không khẳng định console sạch toàn bộ |
| Lint/test/build | Log exit code theo từng Phase; bộ cuối 28 unit + 39 performance test, build chuẩn Turbopack |

Fixture chỉ nhận GET và không có CORS cho các endpoint client theo phiên; vì vậy các phép đo lab phản ánh cùng điều kiện trước/sau, không xác nhận checkout, giá hoặc auth trong môi trường triển khai. Lần click đầu của driver nhắm giữa ảnh bị lớp nội dung card che; đổi sang vùng nội dung đang hiển thị và kiểm tra lại thành công, không sửa mã ứng dụng để phục vụ driver.

## Đề xuất bước tiếp theo

1. Thu LCP/INP/CLS thực tế theo route sau triển khai, kết hợp profile tải/render widget mascot và chuỗi JS để xử lý phần LCP còn chậm. Không suy INP từ TBT hoặc bỏ widget/animation để ép số đẹp.
2. Chạy checklist với staging có CORS, tài khoản guest/host và thanh toán test để kiểm chứng các mục chưa E2E; không dùng cache công khai để che API chậm.
3. Kiểm tra riêng tràn ngang mobile 4 px với baseline cùng viewport trước khi sửa CSS, vì task này yêu cầu giữ giao diện.
