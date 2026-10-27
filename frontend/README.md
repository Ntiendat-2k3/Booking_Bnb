# Booking BnB frontend

Giao diện Next.js cho khách và chủ nhà. Yêu cầu Node.js 20 trở lên; backend chạy ở cổng 3000 khi phát triển local.

## Chạy local

```powershell
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run dev
```

Mở `http://localhost:3001`. API local mặc định ở `http://localhost:3000`. Cấu hình các khóa tích hợp trong `.env` khi dùng Stripe, bản đồ hoặc WebRTC.

## Kiểm tra

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

`npm test` chạy toàn bộ test trong `tests/`. CI còn kiểm tra migration và các luồng nghiệp vụ trên PostgreSQL thử riêng.

## Triển khai

Đặt Root Directory là `frontend`. Production chuyển `/api/v1/*` qua backend trên cùng domain frontend để cookie phiên hoạt động. Đặt `BACKEND_API_ORIGIN` bằng origin backend, không kèm `/api/v1`; nếu không đặt, cấu hình hiện dùng `https://booking-bnb-api.onrender.com`. Để trống `NEXT_PUBLIC_API_BASE_URL` trong production để trình duyệt gọi API cùng origin.

Socket.IO dùng kết nối trực tiếp tới backend: đặt `NEXT_PUBLIC_REALTIME_URL` bằng URL HTTPS của backend và thêm origin frontend vào `CORS_ORIGINS`. Passkey cần HTTPS, `PASSKEY_EXPECTED_ORIGIN` và `PASSKEY_RP_ID` đúng domain frontend. Redis phải hoạt động để dùng Passkey và QR Login.

Sau khi triển khai, kiểm tra `/api/v1/auth/csrf` qua domain frontend, đăng nhập, tải lại trang và xác nhận phiên vẫn còn. Kiểm tra riêng một booking và callback thanh toán trên staging trước khi phát hành.
