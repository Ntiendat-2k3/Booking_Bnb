# Dự án cuối khóa

## Tổng quan hệ thống

Dự án bao gồm 3 thành phần chính:

- **User Page**
- **Admin Page (Dashboard)**
- **API Backend**

### Công nghệ sử dụng

- **User Page**: NextJS
- **Admin Page**: NextJS
- **API**: NodeJS (Express)
- **Database**: PostgreSQL
- **ORM**: Sequelize

### Mô hình hoạt động
Admin Page <==> API (PostgreSQL) <==> User Page

---

## Chủ đề dự án

- Học viên **tự lựa chọn chủ đề** và gửi để được giảng viên duyệt
- Hoặc:
  - Học viên lựa chọn chủ đề từ **danh sách do giảng viên cung cấp**
  - Sau khi chọn, **báo lại cho giảng viên**

---

## Yêu cầu chung

- Thực hiện **nghiêm túc, chỉnh chu**
- Chủ động làm việc, **tập trung để hoàn thành sớm**

---

## Yêu cầu Front-End

- Đảm bảo:
  - UI / UX rõ ràng
  - Responsive trên nhiều thiết bị
- Công nghệ sử dụng:
  - **Tailwind CSS**

---

## Yêu cầu Back-End

- Xây dựng API theo chuẩn **RESTful**
- Code rõ ràng, dễ bảo trì
- Áp dụng:
  - **Transformer** (chuẩn hóa dữ liệu response)
  - **Strict Mode** (validate input, kiểm soát dữ liệu)

---

## Deploy & Hạ tầng

- Deploy trên **server riêng**
- Sử dụng **tên miền riêng**
- Cấu hình môi trường production đầy đủ

---

## Nghiên cứu & mở rộng (Bonus)

- **Docker**
  - Dockerfile
  - Docker Compose cho hệ thống
- **CI/CD**
  - GitHub Actions
  - Tự động:
    - Build
    - Test
    - Deploy
