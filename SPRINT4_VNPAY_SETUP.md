# Sprint 4 – Booking + VNPay

## 1) Database
Chạy script này (Postgres):

`backend/database/sprint4_bookings_payments.sql`

## 2) Backend .env
Thêm các biến môi trường cho backend (ví dụ `.env` trong thư mục `backend/`):

```bash
# VNPay sandbox
VNP_TMNCODE=YOUR_TMN_CODE
VNP_HASHSECRET=YOUR_HASH_SECRET
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

# URL mà VNPay redirect người dùng về (trỏ vào backend)
VNP_RETURN_URL=http://localhost:3000/api/v1/payments/vnpay/return

# Trang FE để hiển thị kết quả (Trips)
FRONTEND_BASE_URL=http://localhost:3001/trips

# Giữ chỗ booking (phút) khi pending_payment
BOOKING_HOLD_MINUTES=15
```

> Lưu ý: nếu chạy local mà muốn VNPay gọi **IPN URL**, backend của bạn cần là public (ngrok / deploy). Ở sandbox, bạn có thể test flow bằng ReturnURL là đủ để cập nhật trạng thái.

## 3) API chính
- `POST /api/v1/bookings` (auth + csrf) tạo booking (pending_payment)
- `POST /api/v1/bookings/:id/payments/vnpay` (auth + csrf) tạo URL VNPay và redirect người dùng đi thanh toán
- `GET /api/v1/payments/vnpay/return` VNPay redirect về (backend verify checksum + update payment/booking + redirect sang FE)
- `GET /api/v1/payments/vnpay/ipn` VNPay server-to-server notify (optional)
- `GET /api/v1/bookings/me` (auth) danh sách trips
- `POST /api/v1/bookings/:id/cancel` (auth + csrf) hủy booking

## 4) Frontend
- Trang chi tiết phòng đã bật form đặt phòng và nút **Đặt phòng**.
- Trang **/trips** hiển thị booking + trạng thái, có nút **Thanh toán** (tạo giao dịch mới) và **Hủy**.
