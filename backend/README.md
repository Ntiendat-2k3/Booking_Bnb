# Airbnb Backend (zip-style Sequelize/Repository)

Kiến trúc theo đúng form `ORM_Squelize_api.zip`:
- `models/index.js` load Sequelize theo `config/config.js`
- `core/repository.js` là base class cho repository
- `repositories/*` chỉ viết query
- `services/*` xử lý nghiệp vụ
- `controllers/api/v1/*` trả JSON
- `routes/api.js` versioning `/api/v1`
- Passport: local + google
- Auth: access token + refresh token (refresh lưu DB dạng hash + revoke + rotate)

## 1) Cài đặt
```bash
npm i
cp .env.example .env
```

## 2) Chuẩn bị DB
- Tạo database Postgres (DB_NAME)
- Tạo bảng `users` và `refresh_tokens` theo schema bạn đã thiết kế.
  - Quan trọng: `users` có `provider` + `provider_id`, `password_hash` cho phép NULL.

> Nếu bạn chưa có SQL, nói mình để mình xuất file SQL đúng với 2 bảng này.

## 3) Chạy
```bash
npm run start
```

## 4) API
- `GET /health`
- `POST /api/v1/auth/register`
  ```json
  { "email":"a@b.com", "password":"123456", "full_name":"Dat" }
  ```
- `POST /api/v1/auth/login`
  ```json
  { "email":"a@b.com", "password":"123456" }
  ```
- `GET /api/v1/auth/google`
- `GET /api/v1/auth/google/callback?mode=json`
- `POST /api/v1/auth/refresh`
  ```json
  { "refresh_token":"..." }
  ```
- `POST /api/v1/auth/logout`
  ```json
  { "refresh_token":"..." }
  ```
- `GET /api/v1/auth/profile` (Header: `Authorization: Bearer <accessToken>`)

