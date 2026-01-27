# Lưu ý liên quan đến bảo mật hệ thống

## SQL Injection

- Hạn chế sử dụng **RAW Query**
- Nếu sử dụng Raw Query:
  - Thông qua **Data Binding** của ORM
- Nếu không dùng ORM:
  - Xử lý, validate và sanitize chuỗi trước khi đưa vào SQL
- Không để lộ tên **framework**, **thư viện** trong thông báo lỗi

---

## Upload File

- Giới hạn định dạng file cho phép (**MIME type**)
- Giới hạn dung lượng file upload
- Ngăn chặn các loại file độc hại:
  - Malware
  - Trojan
  - Script Shell

---

## CSRF (Cross-Site Request Forgery)

- Hình thức tấn công giả mạo request từ người dùng đã đăng nhập

### Giải pháp
- Khởi tạo **CSRF Token**:
  - Token được lưu ở **session**
  - So sánh token trong request với token trên server
- Đảm bảo hệ thống **không bị XSS**

---

## XSS (Cross-Site Scripting)

- Encode HTML entities cho tất cả nội dung hiển thị
- Áp dụng cho các dữ liệu có yếu tố người dùng nhập vào

---

## Brute Force

- Kỹ thuật dò mật khẩu bằng cách gửi nhiều request liên tục

### Giải pháp
- Không thông báo cụ thể lỗi là sai email hay password
- Áp dụng **Rate Limit**:
  - Request nhiều trong một khoảng thời gian → Block
- Khóa tài khoản khi nhập sai mật khẩu nhiều lần
- Bật **Captcha** (Google ReCaptcha)

---

## Xác minh 2 bước (2FA)

- Áp dụng xác minh hai lớp khi đăng nhập
- Gửi mã xác thực qua:
  - Email
  - SMS

---

## Bảo vệ trang quản trị bằng Basic Auth

- Cấu hình xác thực ở tầng server:
  - Nginx
  - Apache

---

## Sử dụng HTTPS

- Cấu hình HTTPS trên server
- Sử dụng chứng chỉ SSL:
  - Let's Encrypt
- Thông qua CDN:
  - Cloudflare

---

## Database Security

- Tắt tính năng **remote connect database**
- Chỉ cho phép kết nối từ các IP trong **whitelist**

