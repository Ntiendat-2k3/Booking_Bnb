# Booking BnB admin

Giao diện Next.js cho quản trị viên. Yêu cầu Node.js 20 trở lên.

## Chạy local

```powershell
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run dev
```

Mở `http://localhost:3002`. `NEXT_PUBLIC_API_BASE_URL` trong `.env.example` trỏ tới backend local ở cổng 3000.

## Kiểm tra

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

## Triển khai

Đặt Root Directory là `admin`. Trong production, để trống `NEXT_PUBLIC_API_BASE_URL` để admin gọi `/api/v1/*` cùng origin; Next.js sẽ chuyển tiếp tới `BACKEND_API_ORIGIN`. Biến này chỉ dùng ở server và không kèm `/api/v1`. Nếu không đặt, cấu hình hiện dùng `https://booking-bnb-api.onrender.com`.

Thêm origin admin vào `CORS_ORIGINS` của backend. Sau khi triển khai, kiểm tra đăng nhập, thao tác ghi có CSRF, tải lại trang và một màn hình đối soát thanh toán trên staging.
