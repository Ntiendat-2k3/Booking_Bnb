# Booking BnB backend

Backend Express, Sequelize/PostgreSQL, Passport, Stripe và Redis tùy chọn. Yêu cầu Node.js 20 trở lên.

## Cấu trúc

| Thư mục | Trách nhiệm |
| --- | --- |
| `routes/v1` | Endpoint, xác thực, CSRF, rate limit và validation |
| `requests/api/v1` | Schema Joi tại ranh giới HTTP |
| `controllers/api/v1` | Đọc request, gọi service, trả response và invalidation cache |
| `services` | Nghiệp vụ và transaction; không gọi dịch vụ ngoài trong transaction DB |
| `repositories` | Query tái sử dụng; khóa và kiểm tra lịch đặt phòng |
| `models`, `migrations` | Mapping Sequelize và thay đổi schema |
| `jobs` | Dọn hold hết hạn và thực thi tác vụ nền |
| `templates` | Nội dung email có escape HTML |
| `middlewares`, `core`, `utils` | Hạ tầng HTTP, cache và tiện ích dùng chung |
| `tests` | Kiểm tra hồi quy bằng `node:test` |

Không bắt buộc tạo repository riêng cho mỗi model. Query chỉ dùng trong một nghiệp vụ có thể nằm trong service; query có logic tái sử dụng nằm trong repository.

## Cài đặt và chạy

Chạy từ thư mục `backend`:

```powershell
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run db:migrate
npm.cmd start
```

Migration `20260301000000-create-core-schema.js` tạo các bảng nghiệp vụ còn thiếu khi chạy trên database trống và giữ nguyên bảng đã có. Các SQL cũ trong `database/` là tài liệu lịch sử, cần đối chiếu schema trước khi áp dụng, không chạy toàn bộ seed vào dữ liệu đang sử dụng.

Migration `20260929000000-create-assets-and-background-jobs.js` tạo `uploaded_assets` và `background_jobs`, yêu cầu đã có `users` và `listings`. Chạy migration trước khi khởi động phiên bản mới. Không dùng `sequelize.sync({ alter: true })` thay migration.

Migration `20260930000000-track-attached-uploads.js` đánh dấu ảnh đã gắn vào phòng để tác vụ nền chỉ dọn ảnh tải lên quá 24 giờ mà chưa gắn. Chạy migration này trước khi khởi động backend phiên bản mới.

Migration `20260929001000-expand-payment-method-providers.js` bổ sung các provider đã được giao diện hỗ trợ nếu enum hiện có còn thiếu. Rollback không xóa enum value vì có thể đã có dữ liệu sử dụng.

Migration `20260930002000-protect-core-data.js` giữ một ảnh bìa theo thứ tự hiển thị nếu dữ liệu cũ có nhiều ảnh bìa, rồi thêm unique index cho ảnh bìa và phương thức thanh toán mặc định. Migration cũng chặn giá/số lượng không hợp lệ và đổi các khóa ngoại của booking, payment, review từ xóa dây chuyền sang chặn xóa cứng để giữ lịch sử. Migration này không hỗ trợ rollback tự động vì không thể phục hồi cờ ảnh bìa cũ một cách tin cậy.

Cấu hình cần kiểm tra trong `.env`:

- PostgreSQL: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`; test dùng `DB_TEST_NAME` hoặc tên database có hậu tố `_test`.
- Auth: secret JWT và cookie; `CORS_ORIGINS` chứa chính xác origin frontend/admin. Không cấu hình allowlist thì browser không được cấp quyền CORS.
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; webhook `/api/v1/payments/stripe/webhook` yêu cầu raw JSON và chữ ký hợp lệ. Thiếu secret trả 503.
- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Email: SMTP hoặc `GAS_MAIL_URL`; thiếu cấu hình thì job được retry, không giả báo gửi thành công.
- Redis: `REDIS_URL` hoặc host/port; có thể dùng `REDIS_DISABLED=true`. Passkey và QR Login cần Redis hoạt động; khi Redis mất kết nối hai cách đăng nhập này trả lỗi tạm thời, các cách khác vẫn hoạt động.
- Passkey: chạy migration `20261003000000-create-passkey-credentials.js`; đặt `PASSKEY_EXPECTED_ORIGIN` đúng origin frontend và `PASSKEY_RP_ID` đúng hostname của origin. Production cần HTTPS. Không đổi RP ID sau khi người dùng tạo Passkey.
- QR Login: Socket.IO chạy trên cùng cổng backend; frontend production đặt `NEXT_PUBLIC_REALTIME_URL` thành URL HTTPS trực tiếp của backend. Cấu hình `CORS_ORIGINS` chứa origin frontend. Mã QR hết hạn sau 120 giây và cần điện thoại đã đăng nhập phê duyệt.
- `BOOKING_HOLD_MINUTES`: số phút giữ lịch chờ thanh toán, mặc định 15; phải là số dương.

## Các bất biến nghiệp vụ

Thao tác đặt/sửa lịch và webhook khóa listing trước booking trong cùng transaction để kiểm tra khoảng ngày và ghi dữ liệu nguyên tử. Khoảng ngày liền kề không xung đột. Checkout và review chỉ được phép khi kỳ lưu trú đã kết thúc theo ngày UTC.

Stripe Checkout được tạo ngoài transaction với idempotency key theo payment ID. Sửa/hủy booking vô hiệu payment đang chờ và enqueue expire session. Webhook xác minh session, số tiền, currency và snapshot booking; payment đến trễ cho lịch đã hủy, hết hold hoặc bị sửa sẽ enqueue hoàn tiền, không phục hồi booking. Refund chỉ chuyển trạng thái `refunded` khi Stripe xác nhận thành công. Chính sách hủy một booking đã thanh toán trước đó vẫn cần quy định nghiệp vụ riêng; bản sửa không bổ sung bảng phí hủy.

Email, xóa Cloudinary, expire session và refund được ghi vào `background_jobs` cùng transaction nghiệp vụ. Worker nhận việc bằng `SKIP LOCKED`, chạy lời gọi ngoài sau commit, retry có backoff và nhận lại lease sau 5 phút nếu tiến trình chết. Không chạy nhiều bản backend khác phiên bản dùng chung queue. Email có thể được gửi lặp nếu tiến trình chết ngay sau khi nhà cung cấp gửi thành công; queue không đảm bảo gửi mail đúng một lần. Payload được xóa khi job hoàn tất, job thất bại giữ lại để retry. Theo dõi các job `pending` có `attempts` cao và lỗi cấu hình nhà cung cấp.

Upload mới lưu metadata và chủ sở hữu trong DB. API attach chỉ nhận `public_id`, `is_cover`, `sort_order`; URL và thông tin ảnh lấy từ metadata server. Ảnh đã attach trước nâng cấp vẫn hiển thị; upload rời chưa được ghi metadata cần upload lại. Xóa ảnh cũ chỉ xóa tài nguyên Cloudinary khi xác minh được namespace listing/chủ nhà.

Ảnh phòng cần `listing_id`, tối đa 20 ảnh đang hoạt động mỗi phòng. Upload ảnh phòng và avatar giới hạn 5 MB/tệp và 30 lượt/10 phút mỗi tài khoản; bộ đếm dùng Redis khi có kết nối, bộ nhớ tiến trình khi Redis không khả dụng. Tệp được giữ tạm trong thư mục hệ thống trong lúc truyền tới Cloudinary rồi xóa; ảnh phòng chưa gắn sau 24 giờ được lên lịch xóa.

Reset token được lưu dưới dạng SHA-256 và không nằm trong response user. Link reset phát hành trước phiên bản này cần xin lại. Reset/đổi mật khẩu revoke refresh token; access token đã phát hành vẫn có hiệu lực tối đa tới hạn JWT.

Rating và danh sách review dùng điều kiện công khai thống nhất: bỏ review bị ẩn/xóa mềm, reviewer đã xóa mềm hoặc tắt hiển thị review. Ẩn profile không trả ID/tên/avatar reviewer. Invalidation cache dùng phiên bản Redis để chặn request cũ đang xử lý ghi lại dữ liệu sau khi xóa cache.

Booking/favorites hỗ trợ `?page=1&limit=50`. Request cũ không truyền pagination vẫn nhận toàn bộ danh sách để tương thích frontend hiện tại. Booking trả `{ data: { items, meta } }`; favorites giữ `data` là mảng và thêm `meta` bên ngoài. Admin bookings/payments/reviews mặc định giới hạn 200 và tìm kiếm trước pagination.

## Kiểm tra

```powershell
npm.cmd test
npm.cmd run check
```

`npm test` chạy toàn bộ test đơn vị và HTTP trong `tests/`; các test tích hợp PostgreSQL được bỏ qua nếu chưa bật cờ riêng. Test đơn vị dùng source thật với model/provider thay thế, mô phỏng khóa từng row và commit/rollback. Chúng không gọi Stripe/Cloudinary/SMTP thật.

Để kiểm tra với PostgreSQL thử riêng, tạo database rỗng, đặt `NODE_ENV=test`, `DB_TEST_NAME`, thông tin kết nối DB và `JWT_SECRET` tối thiểu 16 ký tự. Sau đó chạy:

```powershell
npm.cmd run db:migrate
$env:BOOKING_TEST_DATABASE = '1'
$env:CHAT_TEST_DATABASE = '1'
npm.cmd run test:integration
```

Test tích hợp tạo dữ liệu thử trong database này. CI tạo PostgreSQL dùng một lần, chạy toàn bộ migration rồi kiểm tra đặt trùng lịch, webhook lặp, hủy/hoàn tiền, chat và call. Trước khi phát hành vẫn cần kiểm tra callback và đối soát với Stripe ở môi trường staging có cấu hình riêng; CI không gọi Stripe thật.
