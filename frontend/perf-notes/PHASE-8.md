# Phase 8 — Rendering và cache

Không đổi ứng dụng/cache. Route thí điểm `src/app/rooms/[id]/page.jsx` đã là Server Component: mô tả, tiện ích, host intro, metadata và JSON-LD render từ dữ liệu công khai. `getListingDetail` dùng React.cache để gộp request trong render và revalidate 300 giây đã có. serverGetJson không chuyển tiếp token/cookie người dùng; mặc định các request không chỉ định revalidate là no-store.

Gallery tương tác, booking, giá theo ngày, lịch phòng trống, favorites, reviews có hành vi theo người dùng vẫn client. Không đưa reviews sang cache công khai khi chưa chắc tách được quyền sửa/xóa của người dùng. Không đổi TTL 300 thành 60 chỉ theo ví dụ; giữ chính sách hiện tại đúng yêu cầu bảo toàn hành vi.

Điều kiện dừng: thay auth/checkout, backend/API hoặc cache dữ liệu riêng/tồn phòng/giá sẽ vượt phạm vi. Do route đã có boundary server/client cần thiết, không tạo refactor thí điểm khác hoặc commit để rồi revert một cách hình thức. Cổng lint/test/test:performance/build nằm trong `phase-8-checks.json`, sau khi Phase 1–7 đều xanh.
