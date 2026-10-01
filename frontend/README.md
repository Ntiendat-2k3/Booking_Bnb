This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Cấu hình production: Vercel và Render

Frontend chạy tại `https://booking-bnb-seven.vercel.app`, backend tại `https://booking-bnb-api.onrender.com`. Bản production chuyển `/api/v1/*` qua Render bằng Next.js rewrite để trình duyệt lưu cookie đăng nhập trên domain frontend.

- Vercel: đặt **Root Directory** là `frontend`. Xóa `NEXT_PUBLIC_API_BASE_URL` và `NEXT_PUBLIC_GOOGLE_AUTH_URL` nếu đang trỏ tới `localhost` hoặc Render; nếu cần giữ các biến này, đặt lần lượt thành `https://booking-bnb-seven.vercel.app` và `https://booking-bnb-seven.vercel.app/api/v1/auth/google`. Deploy lại sau khi đổi biến môi trường.
- Render: đặt `NODE_ENV=production`, `FRONTEND_URL=https://booking-bnb-seven.vercel.app`, `CORS_ORIGINS=https://booking-bnb-seven.vercel.app`, `COOKIE_SECURE=true`, `COOKIE_SAMESITE=lax`. Giữ các khóa OAuth và cơ sở dữ liệu trong Environment của Render, không đưa vào frontend.
- Callback trên Render: `FACEBOOK_CALLBACK_URL=https://booking-bnb-seven.vercel.app/api/v1/auth/facebook/callback`. Nếu bật Google hoặc Apple, đặt `GOOGLE_CALLBACK_URL=https://booking-bnb-seven.vercel.app/api/v1/auth/google/callback` và `APPLE_CALLBACK_URL=https://booking-bnb-seven.vercel.app/api/v1/auth/apple/callback`.
- Trên Meta, Google và Apple, đăng ký đúng callback tương ứng ở domain Vercel. Đảm bảo backend đã chạy migration trước khi dùng đăng nhập xã hội.

Trước khi thử OAuth, `https://booking-bnb-api.onrender.com/health` phải trả `200` và `db: connected`. Backend đọc PostgreSQL từ `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` và `DB_SSL`; kiểm tra các biến này trong Environment của Render khi health trả `db: disconnected`.

Sau khi deploy cả frontend và backend, kiểm tra `https://booking-bnb-seven.vercel.app/api/v1/auth/csrf` trả JSON và cookie CSRF trên domain Vercel; `/api/v1/auth/facebook` phải chuyển hướng tới Facebook. Sau đó thử đăng nhập, tải lại trang và kiểm tra phiên vẫn còn.

## Note
Project converted to JavaScript/JSX (no TypeScript).
