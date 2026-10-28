# Khảo sát frontend — 29/10/2026

## Phạm vi và baseline

- Nhánh: `perf/frontend-optimization`. Checkpoint `fc36836` giữ nguyên các thay đổi frontend của hai lượt trước. Các Phase mới được ghi thành commit riêng; không push.
- Chỉ thay đổi file trong `frontend/`. Không sửa backend, admin, Stripe server, CI hay `.env*`.
- Phiên bản thật: Next.js **16.1.6**, React/React DOM **18.3.1**, Tailwind **3.4.19**, Redux Toolkit **2.11.2**. README ghi Next 14 đã cũ.
- Thư viện chính: Phosphor Icons, date-fns 4, react-datepicker 9, Chart.js 4/react-chartjs-2, Mapbox GL 3, Stripe JS, emoji-mart. Upload dùng `FormData` và `apiUpload`, không có thư viện upload cần thêm.
- `npm ci` thất bại với EPERM khi xóa native SWC trên Windows. Đã khôi phục bằng `npm install --ignore-scripts --prefer-offline`, đối chiếu các phiên bản Next/React/Tailwind/Redux/SWC với lockfile và chạy thành công lint/test/build. Không nâng phiên bản ứng dụng.
- Chỉ thêm devDependency được brief cho phép: `@next/bundle-analyzer@16.1.6`. Wrapper analyzer chỉ bật khi `ANALYZE=true`; build bình thường giữ Turbopack. Phân tích Webpack chỉ dùng chẩn đoán, không dùng làm baseline so sánh với Turbopack.

## Dữ liệu khảo sát

- Kiểm kê import/client boundary/effect: [inventory.json](inventory.json).
- Route và JS ban đầu: [before-routes.json](before-routes.json), 24 route, HTTP 200. Đã loại các route lỗi nội bộ của Next.
- Next 16 không in bảng First Load JS trong output build: [baseline-build.txt](baseline-build.txt). Bảng thay thế lấy các script URL trong HTML production và cộng byte/gzip của các file build tương ứng; có tính cả script `nomodule`, cùng cách đo trước/sau.
- Top 10 chunk và package: [baseline-analyzer-summary.json](baseline-analyzer-summary.json). Đây là tổng các chunk trong build, bao gồm chunk tải muộn, không đồng nghĩa First Load JS.
- Cổng chất lượng baseline: [phase-0-checks.json](phase-0-checks.json); lint, test, test:performance, build đều có exit code 0.

## Vấn đề xếp theo tác động

| Ưu tiên | Vị trí | Phát hiện và hướng xử lý |
| --- | --- | --- |
| Cao | `features/aiSearch/AiAssistantLauncher.jsx` | Lighthouse mobile mẫu đầu xác định sprite mascot là LCP; ảnh chỉ được phát hiện sau khi widget nạp. Xem xét preload có ưu tiên thấp ở đúng route hiển thị, giữ nguyên thời điểm và giao diện widget. |
| Cao | `components/MapboxStaticMap.jsx`, `components/Search/SearchResultsMap.jsx`, `components/MapboxAddressPicker/index.jsx` | SDK đã import động theo viewport/thao tác, nhưng CSS Mapbox vẫn import tĩnh. Nạp CSS cùng SDK trước khi tạo map, tái sử dụng một loader chung. |
| Vừa | `components/ListingCard.jsx`, `components/Search/SearchResultsLayout.jsx` | `sizes` dùng chung 420 px chưa sát lưới 3 cột nằm cạnh bản đồ. Truyền kích thước ảnh theo bố cục từ nơi sở hữu lưới. |
| Vừa | `components/Search/SearchResultsLayout.jsx` | Hover/chọn cập nhật state của cả danh sách; callback chọn tạo lại mỗi render. Cần giữ callback ổn định và memo card, bảo toàn tương tác card/map/link. |
| Vừa | `components/FavoriteButton.jsx` | Subscribe toàn Set favorites khiến các nút khác render lại khi đổi một ID. Thu hẹp selector về boolean của đúng listing, không đổi auth/API. |
| Vừa | `app/host/dashboard/page.jsx` | Biểu đồ dynamic chưa có fallback cao 300 px như chart thật; cần giữ chỗ để nội dung dưới không nhảy khi chunk chart xuất hiện. |
| Thấp | `components/organisms/RevenueChart.jsx` | Đăng ký Legend dù mọi chart luôn đặt `legend.display=false`; bỏ import/registration không dùng, kiểm tra bằng bundle. |

## Các phần đã đúng và giới hạn

- `next.config.js` đã có `optimizePackageImports` cho Phosphor/date-fns và bỏ console production, giữ warn/error. Không bật thêm thử nghiệm.
- Redux Provider nằm trong `components/Providers.jsx`; layout gốc vẫn là Server Component. Không thay auth bootstrap hoặc state library.
- Datepicker đã nạp module và CSS khi mở popup. Emoji picker, đề xuất booking và QR decoder đã import động. Biểu đồ host đã dynamic. Không thêm wrapper chỉ để đổi tên props.
- Không có `<img>` thô cần thay. Ảnh dùng Next Image và khung kích thước. Custom CDN image loader có từ trước brief; giữ nguyên, không chuyển loader trong task này.
- Be Vietnam Pro đã tự host bằng `next/font/local`, `display: swap`; 4 weight hiện được dùng trong giao diện. Không đổi font hoặc tải lại từ Google.
- Script trong trang phòng là JSON-LD, không phải script bên thứ ba. Không hoãn/xóa JSON-LD. Stripe/OAuth và các thay đổi liên quan auth/thanh toán thuộc điều kiện dừng, không sửa.
- Favorites hiện đợi API trả về. Nếu thêm phản hồi lạc quan, chỉ thay state hiển thị cục bộ, giữ nguyên thunk/API và rollback khi lỗi; không thay quy tắc quyền truy cập.
- Trang phòng đã render mô tả/tiện ích/metadata công khai trên server; booking/giá ngày/favorites vẫn phía client. Giữ nguyên TTL và chính sách dữ liệu hiện tại, không đổi cache như một cách làm đẹp số đo.

## Phương pháp đo

Production fixture chỉ nhận GET, độ trễ API 350 ms, dữ liệu listing giả cố định; không tạo booking, không gọi thanh toán, không đăng nhập thật. Chuẩn bị cache server trước mỗi lượt Lighthouse; Chrome headless dùng profile mobile mặc định của Lighthouse 12.8.2, 3 mẫu/route, profile trình duyệt mới. Đo trang chủ, tìm kiếm và chi tiết phòng. Checkout không đo LCP có ý nghĩa khi thiếu phiên và booking thật.

INP không đo được bằng navigation Lighthouse; dùng TBT làm chỉ báo lab và ghi riêng. LCP/CLS là số lab, không phải p75 người dùng thật. Báo cáo đầy đủ có trong các file `before-*-1/2/3.json`; tham số token/header được lọc trước khi lưu. Một lần khởi chạy fixture bị khóa `.next` do analyzer còn build; đã dừng lần đó và chạy các build tuần tự.

| Route | LCP lab median | TBT median | CLS median |
| --- | ---: | ---: | ---: |
| home | 9160.1 ms | 239.0 ms | 0.0091 |
| search | 7385.1 ms | 231.0 ms | 0.0000 |
| room | 5683.1 ms | 304.0 ms | 0.0000 |
