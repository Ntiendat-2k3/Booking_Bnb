# Phase 4 — Chữ

Không sửa ứng dụng: `src/app/layout.jsx` đã dùng `next/font/local` cho Be Vietnam Pro, bốn file WOFF2 tự host cho weight 400/500/600/700, `display: swap`. Tailwind dùng `var(--font-be-vietnam-pro)`. Các weight này đều có class/CSS đang dùng; font hiện tại hiển thị tiếng Việt và Latin. Không có Google Fonts link hoặc CSS import cần gỡ. `next/font/local` không có tùy chọn subsets như `next/font/google`; không thêm tùy chọn sai hoặc đổi font-family.

Lighthouse baseline đánh giá font-display đạt 100; không có bằng chứng cần thay asset/font để cải thiện. Giữ nguyên typography và preload do Next quản lý. Cổng lint/test/test:performance/build được chạy lại ở `phase-4-checks.json` trước Phase 5.
