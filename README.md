# 🏡 Booking-bnb — Airbnb Clone

<div align="center">

![Booking-bnb](https://img.shields.io/badge/Booking--bnb-Airbnb_Clone-FF5A5F?style=for-the-badge&logo=airbnb&logoColor=white)

</div>

---

## Công nghệ sử dụng (Tech Stack)

<div align="center">

| Layer        | Technologies                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=flat-square&logo=next.js&logoColor=white) ![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black) ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) ![Redux](https://img.shields.io/badge/Redux_Toolkit-764ABC?style=flat-square&logo=redux&logoColor=white) |
| **Admin**    | ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white) ![Recharts](https://img.shields.io/badge/Recharts-FF6384?style=flat-square)                                                                                                                                                                                                                                                         |
| **Backend**  | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white) ![Express.js](https://img.shields.io/badge/Express.js-404D59?style=flat-square) ![Sequelize](https://img.shields.io/badge/Sequelize-52B0E7?style=flat-square&logo=sequelize&logoColor=white)                                                                                                                                        |
| **Database** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white) ![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)                                                                                                                                                                                                                           |
| **Auth**     | ![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white) ![Passport.js](https://img.shields.io/badge/Passport.js-34E27A?style=flat-square&logo=passport&logoColor=white) ![Google OAuth](https://img.shields.io/badge/Google_OAuth-4285F4?style=flat-square&logo=google&logoColor=white)                                                                                                       |
| **Payment**  | ![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=flat-square&logo=stripe&logoColor=white) ![VNPay](https://img.shields.io/badge/VNPay-0066CC?style=flat-square)                                                                                                                                                                                                                                                                  |
| **Cloud**    | ![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=flat-square&logo=cloudinary&logoColor=white) ![Mapbox](https://img.shields.io/badge/Mapbox-000000?style=flat-square&logo=mapbox&logoColor=white)                                                                                                                                                                                                                        |

</div>

---

## Case Study

### Vấn đề (Problem)

Các nền tảng cho thuê phòng ngắn hạn như Airbnb đòi hỏi sự đồng bộ phức tạp giữa nhiều vai trò: khách hàng đặt phòng, chủ nhà quản lý danh sách, và quản trị viên kiểm soát toàn hệ thống. Mục tiêu của dự án là xây dựng một **hệ thống đặt phòng hoàn chỉnh** — từ tìm kiếm, thanh toán đến quản trị — phục vụ cả 3 nhóm người dùng này trong một kiến trúc thống nhất.

### Thách thức (Challenge)

Thách thức lớn nhất là thiết kế luồng **thanh toán đa cổng** (Stripe cho thẻ quốc tế và VNPay cho nội địa) đảm bảo tính nhất quán khi có sự cố network hoặc callback chậm từ cổng thanh toán. Song song đó, việc quản lý **lịch trống phòng** theo thời gian thực khi nhiều người dùng đặt cùng lúc tiềm ẩn nguy cơ race condition trên dữ liệu. Ngoài ra, hệ thống cần xử lý tìm kiếm nhanh với nhiều bộ lọc chồng nhau (địa điểm, ngày, giá, tiện ích) mà không làm tăng tải database.

### Giải pháp (Solution)

Backend được xây dựng theo **Repository + Service Pattern** để tách biệt rõ business logic khỏi tầng database, giúp dễ dàng mở rộng và kiểm thử từng lớp độc lập. **Redis** được tích hợp làm cache layer cho các truy vấn tìm kiếm phòng nặng, giảm đáng kể số lần truy cập PostgreSQL. Luồng thanh toán được xử lý bằng **Webhook** từ Stripe và callback từ VNPay, đảm bảo trạng thái booking được cập nhật chính xác kể cả khi client mất kết nối giữa chừng. Toàn bộ đầu vào người dùng được validate bằng **Joi** và upload ảnh được uỷ quyền trực tiếp lên **Cloudinary** để tránh lưu file tạm trên server.

---

## Tổng quan hệ thống

Hệ thống được chia thành 3 phần chính hoạt động độc lập và giao tiếp qua API:

```
Admin Page <=> API (Node.js/PostgreSQL) <=> User Page
```

| Thành phần   | Mô tả                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------- |
| **Frontend** | Giao diện trực quan, responsive (Next.js App Router) — trải nghiệm đặt phòng cho Guest và Host |
| **Admin**    | Trang quản trị tập trung — theo dõi doanh thu, người dùng, booking và giao dịch                |
| **Backend**  | RESTful API hiệu suất cao — xử lý toàn bộ business logic, tích hợp thanh toán & bảo mật        |

---

## Chi tiết Chức năng (Features)

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
- **Quản lý Người dùng**: Xem danh sách, phân quyền (User/Host/Admin), khóa tài khoản vi phạm.
- **Quản lý Phòng**: Kiểm duyệt danh sách phòng được đăng tải, ẩn/xóa các phòng không đạt chuẩn.
- **Quản lý Đặt phòng**: Theo dõi toàn bộ luồng booking trên hệ thống, xử lý khiếu nại hoặc hủy phòng.
- **Quản lý Giao dịch**: Đối soát các giao dịch qua Stripe và VNPay.
- **Quản lý Đánh giá**: Xóa hoặc ẩn các đánh giá spam, không phù hợp.
- **Quản lý Tiện ích**: Thêm, sửa, xóa các danh mục tiện ích để Host có thể lựa chọn khi đăng phòng.

---

## Kiến trúc Backend & Tiêu chuẩn Kỹ thuật

Backend được xây dựng với cấu trúc chặt chẽ, dễ dàng mở rộng và bảo trì:

- **Chuẩn RESTful API**: Định tuyến rõ ràng và có versioning (`/api/v1/...`).
- **Pattern áp dụng**: Repository Pattern (Giao tiếp DB) & Service Pattern (Xử lý logic), Controller chỉ làm nhiệm vụ điều phối.
- **Data Transformation**: Chuẩn hóa toàn bộ dữ liệu trả về (Response Formatting).
- **Strict Validation**: Kiểm tra đầu vào chặt chẽ bằng thư viện **Joi** trước khi xử lý.
- **Caching Strategy**: Áp dụng Redis để tối ưu hiệu suất cho các truy vấn nặng (VD: Danh sách phòng, Thông tin hệ thống).

### Tiêu chuẩn bảo mật (Security)

- **Ngăn chặn SQL Injection**: Sử dụng Data Binding và Query Builder của Sequelize.
- **Ngăn chặn XSS & CSRF**: Encode HTML entities, giới hạn request từ các domain lạ (CORS strict).
- **Chống Brute Force**: Cấu hình Express-Rate-Limit chặn nhiều request liên tục vào các endpoint nhạy cảm (Login, Register).
- **Bảo mật Upload**: Giới hạn định dạng MIME type và kích thước file, không lưu trữ file trên server mà đẩy trực tiếp lên Cloudinary.

---

## Cấu trúc thư mục

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

## Hướng dẫn cài đặt & chạy dự án

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

## Deploy & Hạ tầng (Dự kiến)

- **Hệ điều hành**: Linux (Ubuntu/Debian)
- **Web Server**: Nginx làm Reverse Proxy
- **Quản lý Process**: PM2 cho Backend NodeJS
- **Frontend Hosting**: Vercel hoặc tự host bằng PM2/Docker
- **Containerization**: Khuyến khích sử dụng **Docker** và **Docker Compose** để build tự động và thống nhất môi trường.
- **CI/CD**: Tích hợp GitHub Actions để tự động deploy khi có thay đổi.
