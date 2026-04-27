# Booking-bnb (Airbnb Clone)

![Booking-bnb](https://img.shields.io/badge/Booking--bnb-Airbnb_Clone-FF5A5F?style=for-the-badge&logo=airbnb&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-18-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-Backend-404D59?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-316192?style=for-the-badge&logo=postgresql&logoColor=white)

Dự án hệ thống đặt phòng khách sạn / homestay trực tuyến tương tự Airbnb. Dự án được thiết kế với kiến trúc phân tán (Microservices/Monolith linh hoạt), bao gồm trang dành cho người dùng cuối (Frontend), trang quản trị (Admin Dashboard) và hệ thống API Backend mạnh mẽ.

---

## 🌟 Tổng quan hệ thống

Hệ thống được chia thành 3 phần chính hoạt động độc lập và giao tiếp qua API:
`Admin Page <==> API (Node.js/PostgreSQL) <==> User Page`

1. **Frontend (User/Host Page)**: Giao diện trực quan, responsive được xây dựng bằng Next.js (App Router), cung cấp trải nghiệm mượt mà cho khách hàng đặt phòng và chủ nhà quản lý cho thuê.
2. **Admin (Dashboard)**: Trang quản trị tập trung dành cho Admin, theo dõi doanh thu, người dùng, đặt phòng và các tiện ích hệ thống.
3. **Backend (API)**: Cung cấp RESTful API hiệu suất cao, xử lý toàn bộ business logic, tích hợp thanh toán (Stripe, VNPay) và quản lý cơ sở dữ liệu với PostgreSQL & Redis.

---

## 🚀 Chi tiết Chức năng (Features)

### 1. Dành cho Khách hàng (Guest)

- **Xác thực & Bảo mật**: Đăng ký, đăng nhập bằng tài khoản Local hoặc Google OAuth. Chức năng quên mật khẩu / đặt lại mật khẩu qua Email OTP.
- **Tìm kiếm & Bộ lọc nâng cao**: Tìm kiếm phòng theo địa điểm, ngày tháng, số lượng khách. Lọc chuyên sâu theo khoảng giá, loại phòng, và các tiện ích (Wifi, Bể bơi, Bếp,...).
- **Chi tiết phòng & Bản đồ**: Hiển thị hình ảnh trực quan, mô tả chi tiết, tiện ích. Tích hợp **Mapbox** để hiển thị vị trí chính xác của bất động sản.
- **Đặt phòng & Thanh toán (Checkout)**: Quy trình đặt phòng liền mạch. Hỗ trợ đa dạng cổng thanh toán bao gồm **Stripe** (Thẻ tín dụng quốc tế) và **VNPay** (Thanh toán nội địa).
- **Quản lý tài khoản**: Chỉnh sửa thông tin cá nhân, avatar.
- **Danh sách yêu thích (Favorites)**: Lưu lại các phòng ưng ý để đặt sau.
- **Lịch sử chuyến đi (Trips)**: Theo dõi trạng thái các phòng đã đặt, lịch sử giao dịch và hóa đơn.
- **Đánh giá & Nhận xét (Reviews)**: Để lại đánh giá, xếp hạng sao sau khi hoàn thành chuyến đi.

### 2. Dành cho Chủ nhà (Host)

- **Đăng ký trở thành Host**: Chuyển đổi tài khoản từ Khách hàng sang Chủ nhà.
- **Quản lý danh sách phòng (Listings)**: Thêm mới, chỉnh sửa thông tin, tải lên hình ảnh phòng (tích hợp Cloudinary), và xóa phòng.
- **Quản lý Đặt phòng**: Xem danh sách khách hàng đã đặt phòng của mình, theo dõi lịch trình check-in/check-out.
- **Theo dõi doanh thu**: Xem thống kê doanh thu từ các lượt đặt phòng thành công.

### 3. Dành cho Quản trị viên (Admin Dashboard)

- **Dashboard Thống kê**: Biểu đồ trực quan (Recharts) theo dõi tổng doanh thu, số lượng người dùng mới, lượng booking theo thời gian thực.
- **Quản lý Người dùng (Users)**: Xem danh sách, phân quyền (User/Host/Admin), khóa tài khoản vi phạm.
- **Quản lý Phòng (Listings)**: Kiểm duyệt danh sách phòng được đăng tải, ẩn/xóa các phòng không đạt chuẩn.
- **Quản lý Đặt phòng (Bookings)**: Theo dõi toàn bộ luồng booking trên hệ thống, xử lý khiếu nại hoặc hủy phòng.
- **Quản lý Giao dịch (Payments)**: Đối soát các giao dịch qua Stripe và VNPay.
- **Quản lý Đánh giá (Reviews)**: Xóa hoặc ẩn các đánh giá spam, không phù hợp.
- **Quản lý Tiện ích (Amenities)**: Thêm, sửa, xóa các danh mục tiện ích để Host có thể lựa chọn khi đăng phòng.

---

## 🛠 Công nghệ sử dụng

### User/Host Page (`/frontend`)

- **Framework**: Next.js 14+ (App Router, React 18)
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit, React Hooks
- **Libraries**: Mapbox-GL (Bản đồ), Date-fns (Xử lý thời gian), Axios, Sonner (Toast notifications)

### Admin Page (`/admin`)

- **Framework**: Next.js
- **Styling**: Tailwind CSS
- **Libraries**: Recharts (Biểu đồ), React-Paginate, Axios

### Backend API (`/backend`)

- **Core**: Node.js, Express.js
- **Database**: PostgreSQL với ORM Sequelize
- **Caching**: Redis (Tối ưu truy vấn tìm kiếm & session)
- **Authentication**: JWT, Passport.js (Local & Google OAuth)
- **Security**: Helmet, Cors, Express-Rate-Limit, Bcrypt
- **File Upload**: Multer, Cloudinary (Lưu trữ ảnh cloud)
- **Mailing**: Nodemailer (Gửi email xác thực, hóa đơn)
- **Payment**: Stripe

---

## ⚙️ Kiến trúc Backend & Tiêu chuẩn Kỹ thuật

Backend được xây dựng với cấu trúc chặt chẽ, dễ dàng mở rộng và bảo trì:

- **Chuẩn RESTful API**: Định tuyến rõ ràng và có versioning (`/api/v1/...`).
- **Pattern áp dụng**: Repository Pattern (Giao tiếp DB) & Service Pattern (Xử lý logic), Controller chỉ làm nhiệm vụ điều phối.
- **Data Transformation**: Chuẩn hóa toàn bộ dữ liệu trả về (Response Formatting).
- **Strict Validation**: Kiểm tra đầu vào chặt chẽ bằng thư viện **Joi** trước khi xử lý.
- **Caching Strategy**: Áp dụng Redis để tối ưu hiệu suất cho các truy vấn nặng (VD: Danh sách phòng, Thông tin hệ thống).

### 🛡️ Tiêu chuẩn bảo mật (Security)

- **Ngăn chặn SQL Injection**: Sử dụng Data Binding và Query Builder của Sequelize.
- **Ngăn chặn XSS & CSRF**: Encode HTML entities, giới hạn request từ các domain lạ (CORS strict).
- **Chống Brute Force**: Cấu hình Express-Rate-Limit chặn nhiều request liên tục vào các endpoint nhạy cảm (Login, Register).
- **Bảo mật Upload**: Giới hạn định dạng MIME type và kích thước file, không lưu trữ file trên server mà đẩy trực tiếp lên Cloudinary.

---

## 📂 Cấu trúc thư mục

```text
Booking-bnb/
├── admin/          # Giao diện Dashboard quản trị (Next.js)
├── backend/        # API Server (Express + Sequelize)
│   ├── src/
│   │   ├── controllers/   # Điều phối Request/Response
│   │   ├── services/      # Business Logic
│   │   ├── repositories/  # Giao tiếp Database
│   │   ├── models/        # Định nghĩa Schema (Sequelize)
│   │   ├── routes/        # Định tuyến API (v1)
│   │   └── middlewares/   # Auth, Upload, Validation
├── frontend/       # Giao diện Khách hàng & Chủ nhà (Next.js)
│   ├── src/
│   │   ├── app/           # Next.js App Router (Pages)
│   │   ├── components/    # Reusable UI Components
│   │   └── store/         # Redux store
├── stripe/         # Cấu hình Stripe webhook (CLI) cho môi trường local
└── SPRINT4_VNPAY_SETUP.md # Hướng dẫn tích hợp thanh toán VNPay
```

---

## 🏃 Hướng dẫn cài đặt & chạy dự án

### Yêu cầu môi trường

- Node.js (>= 18.x)
- PostgreSQL đang chạy (Local hoặc Docker)
- Redis Server đang chạy
- Các tài khoản dịch vụ bên thứ 3: Cloudinary, Stripe, VNPay, Google Cloud Console (cho OAuth)

### 1. Cài đặt Backend

```bash
cd backend
npm install

# Sao chép và cấu hình biến môi trường
cp .env.example .env
# Chỉnh sửa file .env với thông tin DB, Redis, JWT Secret, Cloudinary, Stripe keys...

# Khởi tạo Database
npx sequelize-cli db:create
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all

# Khởi chạy server API
npm run dev
```

### 2. Cài đặt Frontend (User & Host)

```bash
cd frontend
npm install

# Cấu hình biến môi trường
cp .env.example .env
# (Cần cấu hình NEXT_PUBLIC_API_URL, NEXT_PUBLIC_MAPBOX_TOKEN,...)

# Khởi chạy ứng dụng
npm run dev
```

### 3. Cài đặt Admin Dashboard

```bash
cd admin
npm install

# Cấu hình biến môi trường nếu cần thiết
npm run dev
```

---

## 🌍 Deploy & Hạ tầng (Dự kiến)

- **Hệ điều hành**: Linux (Ubuntu/Debian)
- **Web Server**: Nginx làm Reverse Proxy
- **Quản lý Process**: PM2 cho Backend NodeJS
- **Frontend Hosting**: Vercel hoặc tự host bằng PM2/Docker
- **Containerization**: Khuyến khích sử dụng **Docker** và **Docker Compose** để build tự động và thống nhất môi trường.
- **CI/CD**: Tích hợp GitHub Actions để tự động deploy khi có thay đổi.
