# Booking-bnb (Airbnb Clone)

Dự án hệ thống đặt phòng khách sạn / homestay trực tuyến tương tự Airbnb. Dự án bao gồm trang dành cho người dùng cuối, trang quản trị (Dashboard) và hệ thống API Backend mạnh mẽ.

## 🌟 Tổng quan hệ thống

Hệ thống được chia thành 3 phần chính hoạt động theo mô hình:
`Admin Page <==> API (PostgreSQL) <==> User Page`

1. **Frontend (User Page)**: Xây dựng bằng Next.js, giao diện trực quan, responsive tương tự Airbnb.
2. **Admin (Dashboard)**: Trang quản trị nội dung dành cho Admin.
3. **Backend (API)**: Cung cấp RESTful API, xử lý business logic, tích hợp thanh toán và quản lý cơ sở dữ liệu.

---

## 🚀 Tính năng chính

### Dành cho người dùng (Khách hàng & Chủ nhà)
- **Tìm kiếm & Bộ lọc**: Lọc phòng theo địa điểm, giá cả, tiện ích,...
- **Danh sách & Chi tiết phòng**: Hiển thị thông tin trực quan kèm bản đồ (Mapbox).
- **Đặt phòng & Thanh toán**: Tích hợp thanh toán trực tuyến qua Stripe và VNPay.
- **Quản lý phòng (Chủ nhà)**: Đăng phòng cho thuê, quản lý danh sách phòng.
- **Đánh giá**: Nhận xét và chấm điểm phòng sau khi trải nghiệm.
- **Tài khoản cá nhân**: Đăng nhập (Local/Google OAuth), bảo mật, quản lý phương thức thanh toán, danh sách yêu thích và lịch sử đặt phòng.

### Dành cho Quản trị viên (Admin)
- **Quản trị toàn diện**: Quản lý người dùng, danh sách phòng, đặt phòng, đánh giá.
- **Thống kê & Báo cáo**: Biểu đồ trực quan về doanh thu, lượt đặt phòng (Chart.js / Recharts).

---

## 🛠 Công nghệ sử dụng

### User Page (`/frontend`)
- **Framework**: Next.js (React 18)
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **Libraries**: Mapbox-GL (Bản đồ), Date-fns, Axios, Sonner, Chart.js

### Admin Page (`/admin`)
- **Framework**: Next.js
- **Styling**: Tailwind CSS
- **Libraries**: Recharts, React-Paginate, Axios

### Backend API (`/backend`)
- **Core**: Node.js, Express.js
- **Database**: PostgreSQL với ORM Sequelize
- **Caching**: Redis
- **Authentication**: JWT, Passport.js (Local & Google OAuth)
- **Security**: Helmet, Cors, Express-Rate-Limit, Bcrypt
- **Upload**: Multer, Cloudinary
- **Mail**: Nodemailer
- **Payment**: Stripe, VNPay

---

## ⚙️ Yêu cầu kỹ thuật & Kiến trúc Backend

Backend được xây dựng với cấu trúc chặt chẽ, dễ dàng mở rộng và bảo trì:
- **Chuẩn RESTful API**: Định tuyến rõ ràng.
- **Pattern áp dụng**: Repository Pattern, Service Pattern.
- **Transformer**: Chuẩn hóa toàn bộ dữ liệu trả về (Response).
- **Strict Mode**: Validation input chặt chẽ bằng thư viện Joi.
- **Caching**: Áp dụng Redis để tối ưu hiệu suất truy vấn.

---

## 🛡️ Tiêu chuẩn bảo mật (Security)

Dự án áp dụng nhiều biện pháp bảo mật tối ưu:
- **Ngăn chặn SQL Injection**: Sử dụng Data Binding của Sequelize ORM.
- **Ngăn chặn XSS & CSRF**: Encode HTML entities, giới hạn request từ các domain lạ.
- **Chống Brute Force**: Cấu hình Express-Rate-Limit chặn nhiều request liên tục.
- **Bảo mật Upload**: Giới hạn định dạng MIME type và kích thước file, tải trực tiếp lên Cloudinary.

---

## 📂 Cấu trúc dự án

```text
Booking-bnb/
├── admin/          # Giao diện Dashboard quản trị (Next.js)
├── backend/        # API Server (Express + Sequelize)
├── frontend/       # Giao diện người dùng cuối (Next.js)
├── stripe/         # Cấu hình Stripe webhook (CLI)
├── SPRINT4_VNPAY_SETUP.md # Hướng dẫn tích hợp VNPay
└── ...
```

---

## 🏃 Hướng dẫn chạy dự án

### Yêu cầu cài đặt
- Node.js (>= 18.x)
- PostgreSQL
- Redis Server
- Tài khoản Cloudinary, Stripe (nếu test tính năng upload và thanh toán)

### 1. Cài đặt Backend
```bash
cd backend
npm install
# Cấu hình biến môi trường trong file .env dựa theo .env.example
npx sequelize-cli db:create
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
npm run dev
```

### 2. Cài đặt Frontend (User)
```bash
cd frontend
npm install
# Cấu hình biến môi trường .env (API_URL, MAPBOX_TOKEN,...)
npm run dev
```

### 3. Cài đặt Admin Dashboard
```bash
cd admin
npm install
npm run dev
```

---

## 🌍 Deploy & Hạ tầng (Dự kiến)
- **Server riêng** với tên miền riêng biệt.
- **Môi trường**: Linux, Nginx làm Reverse Proxy.
- Có thể kết hợp **Docker/Docker Compose** để build tự động và **CI/CD** với GitHub Actions.
