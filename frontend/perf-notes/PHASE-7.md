# Phase 7 — Mượt

- `ListingCard` dùng React.memo với so sánh props mặc định. `SearchResultsLayout` giữ `selectCard` bằng useCallback; setter hover vốn ổn định. Card không đổi listing/dates/highlight sẽ không cần chạy lại theo mỗi state hover của lưới. Locale/context và state riêng vẫn cập nhật bình thường, không dùng comparator bỏ qua dữ liệu.
- `FavoriteButton` tái sử dụng factory `selectIsFavorite` đã có, memo theo listingId; Redux subscription nhận boolean thay vì cả Set. Không thêm selector/business rule song song.
- Tim phản hồi ngay bằng state hiển thị cục bộ, scope theo listing và user hiện tại. Chặn bấm lặp trong lúc pending, đặt aria-busy, kết quả Redux/API vẫn là nguồn quyết định. finally xóa dự đoán; lỗi API trả về trạng thái gốc. Thunk, endpoint, token, kiểm tra phiên và chuyển login giữ nguyên.
- GitNexus trả LOW cho ba symbol chính và callback chọn phòng. Đối chiếu import: card/favorites dùng chung ở home/search/favorites/room và các danh sách liên quan, nên đã giữ test dữ liệu card, query ngày, tương tác keyboard/map/link và guard phiên.
- Test hồi quy được mở rộng: callback giữ identity sau hover; tim đổi trước khi Promise hoàn tất, không gửi request lặp, rollback lỗi và đồng bộ thành công. Tổng 28 unit + 39 performance test, kết quả trong `phase-7-checks.json`.
- Debounce địa điểm 300 ms, minimum length, AbortController, cache giới hạn và chống response cũ đã có ở useMapboxAutocomplete; không chồng thêm timer. Giá/tiện ích dùng form submit, không gọi API mỗi phím nên giữ nguyên ngữ nghĩa áp dụng lọc.
- Search phân trang 24 item; không virtualize hoặc thay bằng infinite scroll vì sẽ đổi hành vi. Chưa có bằng chứng lọc hàng nghìn item tại client cần useDeferredValue/useTransition. Không thêm hook/abstraction chỉ để đủ danh sách kỹ thuật.

Tham chiếu: [React memo và props ổn định](https://react.dev/reference/react/memo).
