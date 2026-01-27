- **Website tham khảo**: https://www.airbnb.com.vn

## Chức năng chính

- Bộ lọc, phân loại phòng,…
- Hiển thị danh sách phòng, thông tin chi tiết phòng
- Đánh giá, đặt phòng, thanh toán trực tuyến
- Cho thuê phòng:
  - Đăng phòng cho thuê
  - Quản lý phòng cho thuê
- Tài khoản:
  - Thông tin cá nhân
  - Đăng nhập và bảo mật
  - Phương thức thanh toán
  - Quyền riêng tư
  - Danh sách yêu thích
  - Phòng đã đặt

## Yêu cầu chung

- Xây dựng giao diện chỉnh chu theo mẫu website tham khảo
- Xây dựng trang quản trị riêng và trang dành cho người dùng
- Mọi thông tin trên website đều thay đổi được bằng trang quản trị
- Học viên tự xây dựng module trong trang quản trị
  hoặc liên hệ với giảng viên để được tư vấn
- **Các yêu cầu về kỹ thuật**: Giảng viên đã mô tả trong buổi học cuối cùng


## Cấu trúc thư mục Backend

```text
.
├── public
│   core
│   └── cache.js (redis)
│   └── repository.js (database)
│   └── transformer.js
│
├── src
│   ├── config
│   ├── controllers
│   ├── database
│   ├── middlewares
│   ├── models
│   ├── repositories
│   ├── requests
│   ├── routes
│   ├── services
│   │   └── user.service.js
│   ├── transformers
│   ├── utils
│   └── app.js
├── .env
├── .sequelizerc
├── package-lock.json
├── package.json
