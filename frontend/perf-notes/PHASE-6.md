# Phase 6 — Giữ

- Dashboard giữ chỗ cho chunk `RevenueChart` bằng div `h-[300px] min-w-0`, đúng wrapper chart thật. Fallback không thêm text/màu/UI mới, chỉ tránh đẩy phần nội dung bên dưới khi chart sẵn sàng.
- GitNexus trả LOW, direct/process = 0; caller thực tế là route host dashboard. Không sửa effect/API báo cáo, xác thực hoặc quyền host.
- Navbar đã có vùng menu min-height 44 px và avatar kích thước 30 px cho cả guest/user. Không đổi bố cục nút theo role hoặc trạng thái auth. Map, gallery, card đã có chiều cao/aspect-ratio; toast/mascot dùng overlay. Không thêm skeleton khác khi chưa có bằng chứng sai kích thước.
- CLS baseline home 0.0091, search/room 0; đo lại ở Phase 9. Chưa xác nhận CLS dashboard bằng tài khoản host thật. Cổng lint/test/test:performance/build: `phase-6-checks.json`.
