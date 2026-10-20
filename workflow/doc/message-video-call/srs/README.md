# SRS — message-video-call

## 1. Nguồn

| File | Vai trò |
|---|---|
| [WEBRTC_PRACTICE_SPEC.md](WEBRTC_PRACTICE_SPEC.md) | Đặc tả nghiệp vụ gốc của feature |

Phạm vi baseline trước code là MVP P0 theo §19 và §23 của đặc tả. Các mục P1/P2 chưa có trong registry triển khai, trừ hành vi đã tồn tại cần bảo toàn. Tên API, field và event trong §10–12 là **đề xuất**. Theo chỉ đạo của người dùng khi không có Swagger/OpenAPI, contract chat hiện hữu được đối chiếu trực tiếp với backend trong `../backend-contract.md`; call API chưa có trong backend vẫn OPEN.

## 2. Requirement Registry

Origin: `SRS` hoặc `EXTRA`. Clear: `YES` hoặc `CONFIRM`. Priority: `HIGH`, `MED`, `LOW`.

<!-- table:req -->
| REQ | Summary | Source | Origin | Priority | Clear |
|---|---|---|---|---|---|
| REQ-MSG-01 | Tạo hoặc mở chat 1–1 đúng hai người theo quyền liên hệ và ngữ cảnh listing hoặc booking hợp lệ; không tạo trùng | SRS §5.1, §6 FR-CHAT-002, §17 AC-CHAT-001 | SRS | HIGH | YES |
| REQ-MSG-02 | Danh sách hội thoại riêng tư có preview, unread và phân trang; lịch sử tải trang mới nhất rồi tải trang cũ theo thứ tự server | SRS §6 FR-CHAT-001, FR-CHAT-003; §15 NFR-014 | SRS | HIGH | YES |
| REQ-MSG-03 | Gửi text đã trim và kiểm tra giới hạn, lưu bền vững, retry idempotent, trạng thái pending/sent/failed rõ ràng | SRS §5.2, §6 FR-CHAT-004–005, §17 AC-CHAT-002–003 | SRS | HIGH | YES |
| REQ-MSG-04 | Gửi/nhận realtime chỉ cho participant, chống lặp và tải bù từ HTTP sau reconnect | SRS §6 FR-CHAT-006, §12.1–12.3, §17 AC-CHAT-005 | SRS | HIGH | YES |
| REQ-MSG-05 | Khởi tạo một call 1–1 hợp lệ; chặn call xung đột của conversation hoặc user; báo incoming đúng callee | SRS §5.3 BR-020–022, §7 FR-CALL-001–002, §17 AC-CALL-001 | SRS | HIGH | YES |
| REQ-MSG-06 | Accept, decline, cancel, timeout và end là chuyển trạng thái có thẩm quyền phía server, nguyên tử và terminal không quay lại active | SRS §7.1, FR-CALL-003–006, FR-CALL-011; §17 AC-CALL-002–003, AC-CALL-007 | SRS | HIGH | YES |
| REQ-MSG-07 | Xin quyền media sau hành động người dùng, xử lý thiết bị/HTTPS/browser không hỗ trợ và lựa chọn audio-only theo mặc định SRS | SRS §7 FR-CALL-007–008, §13.3, §13.5, §17 AC-CALL-006 | SRS | HIGH | YES |
| REQ-MSG-08 | Signaling offer/answer/ICE chỉ giữa hai call participant; xử lý candidate sớm, event trễ và kết nối WebRTC 1–1 | SRS §12.4–12.6, §13.1–13.2, §17 AC-CALL-002 | SRS | HIGH | YES |
| REQ-MSG-09 | Hiển thị local/remote media; mute, tắt/bật camera và end khớp track thực; cleanup idempotent | SRS §7 FR-CALL-008–011, §13.3, §17 AC-CALL-004–005 | SRS | HIGH | YES |
| REQ-MSG-10 | Phân biệt signaling/media state; xử lý disconnect, grace period, reconnect, reload và backend restart không treo call | SRS §7 FR-CALL-012, §8.3 EDGE-014–019 và 025, §13.4, §17 AC-CALL-008 | SRS | HIGH | YES |
| REQ-MSG-11 | Bảo vệ auth/resource, validate/rate-limit payload, tránh phát dữ liệu cho người lạ, không lưu hoặc log media/SDP/ICE/nội dung chat | SRS §2.2, §14, §15 NFR-002 và NFR-010 | SRS | HIGH | YES |
| REQ-MSG-12 | Chat và call có loading/empty/error, responsive và điều khiển có nhãn/focus trên browser mục tiêu | SRS §9, §13.6, §15 NFR-008–009 và NFR-013, §17.3 | SRS | MED | YES |

## 3. Open Questions

Blocking: `YES` phải `RESOLVED` trước Gate 1. Các giá trị mặc định đã được SRS cho phép dùng cho MVP được ghi ở Plan §4; chúng không được tự nâng thành contract API.

<!-- table:oq -->
| OQ | REQ | Question | Blocking | Status | Resolution |
|---|---|---|---|---|---|
| OQ-01 | REQ-MSG-05 | Swagger/OpenAPI hoặc contract được duyệt cho chat và call ở đâu? SRS §11–12 chỉ là proposal | YES | RESOLVED | Người dùng xác nhận không có Swagger và chỉ đạo đọc backend; `../backend-contract.md` là nguồn contract chat hiện có. Call chưa có backend nên API-05, API-06, API-08 vẫn OPEN cho tới khi thiết kế và kiểm chứng từng Phase. |
| OQ-02 | REQ-MSG-12 | Browser mobile mục tiêu để nghiệm thu WebRTC là Safari iOS hay Chrome Android? | NO | OPEN | Chốt trước test thiết bị thật theo SRS §13.6 |
| OQ-03 | REQ-MSG-11 | Chính sách retention cho message và call metadata khi triển khai production là gì? | NO | OPEN | Chốt trước release theo SRS §14.3; MVP không tự xóa dữ liệu |
| OQ-04 | REQ-MSG-01 | Có yêu cầu mở chat trực tiếp từ booking ngoài luồng liên hệ listing đang có không? | NO | OPEN | SRS cho phép chat không gắn booking; chỉ mở rộng entrypoint khi có yêu cầu cụ thể |
