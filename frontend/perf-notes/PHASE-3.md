# Phase 3 — Ảnh

- Lưới tìm kiếm truyền `sizes` theo breakpoint và vùng nội dung còn lại bên cạnh map vào `ListingCard`; grid, khung ảnh và nội dung không đổi. Ở desktop rộng, card thực tế khoảng 249 px trong container 1360 px, thay vì khai báo mặc định 420 px. Mặc định cho các caller khác giữ nguyên.
- HTML của launcher gợi ý preload sprite hướng của mascot, ưu tiên thấp, chỉ ở route có hiển thị widget. Đây là tài nguyên LCP được Lighthouse baseline chỉ ra. Giữ nguyên idle gate, animation, vị trí, khả năng kéo và việc giữ hội thoại qua chuyển route; không trì hoãn widget để né số đo.
- URL sprite được khai báo chung trong `mascotAssets.js`, tránh preload lệch URL widget. Chỉ preload sprite mặc định, không preload reaction không dùng ngay.
- GitNexus trả LOW cho ListingCard/SearchResultsLayout/FloatingAiAssistant; Launcher chưa có trong index (UNKNOWN), đã kiểm tra caller duy nhất trong root layout. Thay đổi root chỉ là resource hint theo đúng route, không thêm UI.
- Không có ảnh `<img>` thô. Ảnh phòng đầu đã priority; thẻ phòng lazy và chỉ có một ảnh cover. Gallery chi tiết có autoplay/thumbnails, giữ lazy browser hiện tại để không làm trống ảnh khi tự chuyển. Gallery thực tế tràn hết chiều ngang nên `100vw` đang đúng, không ép xuống container 1360 px.
- Giữ nguyên remotePatterns, định dạng và custom CDN loader có từ checkpoint. Nếu dùng lại tối ưu ảnh mặc định Next/Vercel sau này, cần tính hạn mức theo gói; task này không đổi loader.
- Test launcher kiểm tra hint theo route, không kéo module widget sớm, vẫn giữ instance và hidden state. Cổng kiểm tra: `phase-3-checks.json`. Hiệu quả preload chỉ được kết luận từ Lighthouse sau cùng.

Tham chiếu: [Next Image sizes](https://nextjs.org/docs/app/api-reference/components/image#sizes).
