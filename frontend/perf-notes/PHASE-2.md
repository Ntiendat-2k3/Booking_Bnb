# Phase 2 — Lười

- Ba component bản đồ dùng chung `lib/loadMapbox.js`: SDK và CSS chỉ được yêu cầu khi component thực sự cần bản đồ; chờ cả hai trước khi tạo instance. Giữ nguyên kích thước, viewport gate, marker, camera và thao tác địa chỉ.
- `CallSessionProvider` chỉ nạp/render `CallOverlay` khi có call. Signaling, media, reconciliation, quyền người dùng và các action không đổi. Test mới kiểm tra trạng thái không có call, incoming, terminal và dismiss.
- GitNexus trả LOW, direct callers/processes = 0 do hạn chế cạnh JSX. Đối chiếu import thực tế: map dùng ở tìm kiếm/chi tiết/form host, provider nằm trong Providers ở gốc. Không coi kết quả 0 là không có tác động.
- Calendar, emoji, biểu đồ đã dynamic; không thêm lớp wrapper. Stripe/OAuth thuộc điều kiện dừng: giữ nguyên toàn bộ mã xác thực/thanh toán.
- Kết quả lint/test/test:performance/build nằm trong `phase-2-checks.json`. Test bản đồ hiện có tiếp tục kiểm tra ngoài viewport, hủy tải, không khởi tạo trùng và camera 3D. Đối chiếu chunk/CSS thực tế được lưu trong lần đo production cuối.

Tham chiếu cách nạp component theo nhu cầu: [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading).
