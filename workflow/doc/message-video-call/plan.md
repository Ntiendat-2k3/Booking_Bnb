# PLAN — message-video-call

- **SRS:** `srs/`
- **Codebase:** `backend/{routes,controllers,requests,services,repositories,models,integrations}/`, `frontend/src/features/chat/`, `frontend/src/app/messages/`
- **Survey commit:** `32ff5dc` (2026-10-20); chat/workflow là thay đổi chưa commit của người dùng
- **CHECK_CMD:** `npm --prefix backend test && npm --prefix frontend run test:chat && npm --prefix frontend run lint`
- **PQG:** PASS

Plan đã được người dùng chấp nhận để phân rã Task ngày 2026-10-20. Người dùng xác nhận không có Swagger/OpenAPI và chỉ đạo dùng backend làm nguồn contract. Chat API-01–04, API-07 được đối chiếu trong `backend-contract.md`; call API-05, API-06, API-08 chưa tồn tại nên giữ OPEN. Không code phần phụ thuộc API còn OPEN.

## 0. REQ → Plan

`NegNA`: `-` yêu cầu TC Negative/Boundary sau khi có Task.

<!-- table:trace -->
| REQ | PlanSec | NegNA |
|---|---|---|
| REQ-MSG-01 | §2, §4, §5.1 | - |
| REQ-MSG-02 | §2, §5.1 | - |
| REQ-MSG-03 | §2, §4, §5.1 | - |
| REQ-MSG-04 | §2, §5.1 | - |
| REQ-MSG-05 | §2, §4, §5.1 | - |
| REQ-MSG-06 | §2, §4, §5.1 | - |
| REQ-MSG-07 | §2, §4, §5.1 | - |
| REQ-MSG-08 | §2, §4, §5.1 | - |
| REQ-MSG-09 | §2, §4, §5.1 | - |
| REQ-MSG-10 | §2, §4, §5.1 | - |
| REQ-MSG-11 | §2, §4, §5.1 | - |
| REQ-MSG-12 | §2, §5.1 | - |

## 1. Tổng quan nghiệp vụ

- **Mục tiêu:** Giữ chat 1–1 hiện có và hoàn thiện các khoảng trống P0; thêm call video 1–1 có state phía server, signaling có phân quyền và media lifecycle an toàn.
- **Actor/Role:** User đã đăng nhập là customer/host theo quan hệ listing hoặc booking; admin/guest không mặc định đọc nội dung hay tham gia call.
- **Luồng chính:** Contact host → hội thoại → gửi/nhận text → caller tạo call → callee accept → signaling → media → end/cleanup.
- **Luồng ngoại lệ:** Người ngoài đoán ID, retry mất response, socket mất kết nối, cuộc gọi đồng thời, nhiều tab accept, timeout, không có media permission, ICE thất bại, reload và backend restart.
- **Open Questions:** xem `srs/README.md` §3. Q-001–Q-007 trong SRS có mặc định cho MVP; chỉ OQ-01 chặn thiết kế contract.
- **Ngoài MVP:** Typing, archive, call history UI chi tiết, chọn camera, file/ảnh, group, recording. Read cursor và presence đã có thì giữ nguyên.

## 2. Gap analysis — code hiện tại thiếu gì để đạt SRS?

Level: HIGH, MED, LOW. “Có” dưới đây là bằng chứng mã, chưa đồng nghĩa đã nghiệm thu thiết bị thật.

<!-- table:gap -->
| REQ | Current | Gap | Level | Evidence |
|---|---|---|---|---|
| REQ-MSG-01 | Contact host kiểm tra listing published/host active; direct pair có unique key | Chưa có entrypoint/quan hệ booking riêng; cần xác nhận P0 có yêu cầu booking hay không | MED | `backend/integrations/booking/chat.adapter.js`, `backend/repositories/chat.repository.js` |
| REQ-MSG-02 | List theo page, history theo sequence cursor, unread từ read cursor | Cần đối chiếu empty/loading/nullable và kiểm thử giới hạn trang thực với contract | MED | `backend/requests/api/v1/chat.schema.js`, `backend/repositories/chat.repository.js`, `frontend/src/features/chat/` |
| REQ-MSG-03 | Joi trim 1–4000; client_key UUID; lưu trước phát socket; pending/failed/retry | SRS đề xuất 5000 nhưng cho phép hiệu chỉnh; giữ 4000 nếu contract duyệt; kiểm thử retry/validation qua HTTP và DB | MED | `backend/services/chat.service.js`, `backend/requests/api/v1/chat.schema.js`, `frontend/src/features/chat/hooks/useMessages.js` |
| REQ-MSG-04 | Socket auth bằng cookie/ticket, room theo user, frontend reload sau reconnect | Cần kiểm thử mất event, thứ tự và nhiều tab trên luồng thật | MED | `backend/services/chat.socket.js`, `frontend/src/features/chat/hooks/useChatSocket.js`, `frontend/src/features/chat/utils/mergeMessage.mjs` |
| REQ-MSG-05 | Nút video đang disabled | Không có call session, create/incoming, busy policy hay giới hạn active call | HIGH | `frontend/src/features/chat/components/ConversationView.jsx`; không thấy call files trong `backend/` |
| REQ-MSG-06 | Chưa có call backend | Thiếu state machine, atomic transitions, server timeout và multi-tab accept | HIGH | `backend/models/`, `backend/services/`, `backend/routes/v1/chat.routes.js` |
| REQ-MSG-07 | Chưa có media client | Thiếu xin quyền, lỗi thiết bị, secure context và audio-only choice | HIGH | `frontend/src/features/chat/` |
| REQ-MSG-08 | Socket chat chỉ phát event server-side, không nhận signaling command | Thiếu authorized offer/answer/ICE và peer connection | HIGH | `backend/services/chat.socket.js`, `frontend/src/features/chat/` |
| REQ-MSG-09 | Chưa có call UI | Thiếu local/remote video, track controls, end và cleanup | HIGH | `frontend/src/features/chat/components/ConversationView.jsx` |
| REQ-MSG-10 | Chat reconnect tải lại HTTP | Chưa có call reconcile, grace period, stale terminal cleanup | HIGH | `frontend/src/features/chat/hooks/useChatSocket.js`, `backend/services/chat.socket.js` |
| REQ-MSG-11 | Chat HTTP có auth/CSRF/rate-limit và membership check; socket xác thực phiên | Chưa có phân quyền/rate-limit/payload cap cho call và signaling; cần review rò rỉ log | HIGH | `backend/routes/v1/chat.routes.js`, `backend/services/chat.socket.js` |
| REQ-MSG-12 | Chat có trạng thái cơ bản, aria label; UI call chưa có | Cần kiểm thử responsive/a11y call, browser/thiết bị thật | MED | `frontend/src/features/chat/components/ConversationView.jsx`, SRS §9 |

## 3. Impact analysis

Khảo sát nguồn thật được ưu tiên vì chat và workflow đang là file chưa commit, chưa có trong GitNexus index. Index GitNexus báo chậm một commit; lệnh cập nhật không hoàn tất do sandbox không ghi được `C:\Users\ASUS\.gitnexus\registry.json`. Trước **mỗi sửa symbol khi code**, phải chạy `gitnexus_impact` theo AGENTS.md và báo blast radius; không dùng bảng này thay kết quả đó.

| Area | Path | Impact | Shared | Conflict |
|---|---|---|---|---|
| Auth/CSRF | `backend/middlewares/api/auth.middleware.js`, `backend/middlewares/csrf.middleware.js` | Call HTTP phải dùng cùng danh tính và bảo vệ lệnh ghi | Yes | HIGH |
| Booking/listing | `backend/integrations/booking/chat.adapter.js` | Quyền liên hệ phải xác minh từ domain; không tin target role từ client | No | MED |
| Chat state/data | `backend/services/chat.service.js`, `backend/repositories/chat.repository.js`, `backend/models/chat_*.js` | Dùng lại membership, participants và room; tránh đổi schema chat không cần thiết | Yes | HIGH |
| Realtime | `backend/services/chat.socket.js`, `backend/bin/www` | Tận dụng namespace/socket auth; cần tách quyền signaling theo call | Yes | HIGH |
| API/validation | `backend/routes/v1/chat.routes.js`, `backend/requests/api/v1/chat.schema.js` | Contract chat khác SRS proposal; call endpoints/event phải được xác minh trước code | Yes | HIGH |
| UI | `frontend/src/features/chat/`, `frontend/src/app/messages/` | Kích hoạt video từ nút hiện có; incoming khi ở trang khác cần vị trí mount đủ rộng | Yes | MED |
| Data/migration | `backend/models/`, `backend/migrations/` | Call session cần lưu metadata và ràng buộc một active call/user | No | HIGH |
| Tests | `backend/tests/chat*.test.js`, `frontend/tests/chat.test.mjs` | Reuse test auth/idempotency; thêm test race, signaling và cleanup | No | MED |

## 4. Core business rules

ID dưới đây chuẩn hóa các rule P0 trong SRS.

<!-- table:br -->
| BR | REQ | Rule | Exception |
|---|---|---|---|
| BR-01 | REQ-MSG-01 | Chỉ customer/host hợp lệ của listing hoặc booking được mở chat 1–1; một cặp phù hợp không tạo hội thoại trùng | SRS BR-001–006 |
| BR-02 | REQ-MSG-02 | Chỉ participant đọc list/history; lịch sử theo sequence/timestamp server và phân trang | SRS BR-006, BR-018 |
| BR-03 | REQ-MSG-03 | Tin text trim không rỗng, trong giới hạn backend; client key retry trả đúng một message canonical | SRS BR-010–015; 5000 là default đề xuất, code hiện tại 4000 |
| BR-04 | REQ-MSG-04 | Event chỉ tới participant hợp lệ; duplicate/reconnect phải reconcile từ HTTP | SRS §12.1 |
| BR-05 | REQ-MSG-05 | Tối đa một active call mỗi conversation và mỗi user; caller/callee là hai participant | SRS BR-020–022 |
| BR-06 | REQ-MSG-06 | Chỉ callee accept/decline khi ringing, caller cancel trước accept; chỉ một transition đồng thời thắng | SRS BR-023, BR-025–027, BR-033 |
| BR-07 | REQ-MSG-06 | Terminal state bất biến; timeout do server quyết định; end idempotent và báo peer | SRS §7.1, BR-028 |
| BR-08 | REQ-MSG-07 | Không xin quyền hay bật media trước hành động phù hợp; lỗi permission/device không treo call | SRS BR-024, FR-CALL-007 |
| BR-09 | REQ-MSG-08 | Signaling chỉ giữa hai participant của call active, payload có giới hạn và không chấp nhận event trễ sau terminal | SRS BR-032, §13.2, §14.2 |
| BR-10 | REQ-MSG-09 | Mute/camera phản ánh track thực; end/unmount đóng peer connection và stop local tracks sở hữu | SRS §13.3 |
| BR-11 | REQ-MSG-10 | Mất kết nối có grace period; signaling disconnect không tự chứng minh media đã mất | SRS BR-029, §13.4 |
| BR-12 | REQ-MSG-11 | Backend xác minh auth/resource mọi lệnh; không lưu hoặc log media, SDP/ICE hay nội dung chat mặc định | SRS BR-030, §14 |
| BR-13 | REQ-MSG-12 | Call controls có nhãn/focus/trạng thái rõ và dùng được trên viewport/browser mục tiêu | SRS §9 |

Mặc định dự kiến từ SRS: ring timeout 40 giây, grace period 15 giây, chat max length theo contract hiện có nếu được xác minh, không cấp admin quyền nội dung, không hard delete. Không có media recording. P1/P2 không nằm trong Task MVP.

## 5. Implementation strategy

### 5.1 Approach

1. **Chat foundation:** xác minh contract đang chạy từ backend theo `backend-contract.md`, giữ `/api/v1/chat` và các field `body/client_key`; bổ sung test cho quyền, persistence, retry, reconnect. Chỉ thêm booking entrypoint khi OQ-04 được yêu cầu.
2. **Call domain:** dùng participant/auth hiện có để kiểm quyền. Lưu CallSession metadata riêng; transaction/atomic transition và ràng buộc active call để chống race. Server kiểm tra timeout/reconcile kể cả sau restart. Không đặt state nghiệp vụ có thẩm quyền ở React.
3. **Signaling:** dùng namespace `/chat` và room theo user đã xác thực. Mọi offer/answer/ICE phải kiểm call participant, state và kích thước/tần suất; không broadcast room tùy client. Tên event chỉ chốt sau contract.
4. **Media/UI:** dùng browser WebRTC; chỉ lấy track sau user action. Một peer connection/call ở client, buffer ICE sớm, xử lý autoplay, audio-only choice, state media riêng state call, cleanup có thể gọi lặp. Hiển thị incoming ở vị trí nhận được event khi user ở trang khác trong website.
5. **Verification:** test backend state/race/auth bằng integration thực, frontend reconcile/cleanup bằng test phù hợp, hai browser session và thiết bị/browser mục tiêu. Tách test chat sẵn có khỏi phần call mới để tránh phá chức năng hiện hành.

### 5.2 Quyết định kỹ thuật

| Quyết định | Lý do | Alternative đã loại | Ảnh hưởng |
|---|---|---|---|
| Giữ chat routes/schema hiện tại cho tới khi contract xác minh | Chúng đang được frontend dùng và SRS ghi API chỉ là proposal | Thay toàn bộ bằng URL/field mẫu trong SRS | Tránh phá chat đang dở |
| Reuse user room và socket auth hiện có | Đã kiểm phiên, account active và hỗ trợ nhiều tab | Tạo socket server/auth thứ hai | Giảm nguồn danh tính trùng |
| Tách CallSession khỏi chat message | Trạng thái nghiệp vụ và atomic transition riêng | Dùng message hoặc client state làm nguồn call | Có chỗ reconcile và timeout |
| Tách call state phía server với media state phía browser | Socket có thể mất khi media còn chạy | Một boolean connected chung | Tránh end sai và UI sai |
| Không thêm TURN mặc định hoặc hardcode ICE credential | SRS không bảo đảm STUN-only cho production | TURN công cộng không kiểm soát | Cần đánh giá hạ tầng trước release |

### 5.3 API contract

State `VERIFIED` của chat nghĩa là đã đối chiếu route/schema/controller/service backend theo chỉ đạo của người dùng thay cho Swagger/OpenAPI. Đây là ngoại lệ nguồn contract của R60, không xác nhận runtime ngoài các test đã chạy. State `OPEN` của call nghĩa là SRS mới đề xuất, chưa có backend; chỉ code API sau khi thiết kế và kiểm chứng contract của Phase liên quan.

<!-- table:api -->
| API | Purpose | Endpoint | Contract | State |
|---|---|---|---|---|
| API-01 | List/detail hội thoại | GET /api/v1/chat và GET /api/v1/chat/:id | Backend route/schema/controller/service/repository; `backend-contract.md` | VERIFIED |
| API-02 | Contact host | POST /api/v1/chat/listings/:listingId | Backend route/adapter/service; `backend-contract.md` | VERIFIED |
| API-03 | History và send | GET/POST /api/v1/chat/:id/messages | Backend route/schema/controller/service/repository; `backend-contract.md` | VERIFIED |
| API-04 | Read/unread và socket ticket | PATCH /api/v1/chat/:id/read; GET /api/v1/chat/unread; GET /api/v1/chat/socket-ticket | Backend route/schema/controller/service/socket ticket; `backend-contract.md` | VERIFIED |
| API-05 | Tạo/truy vấn call | SRS §11.3 proposal | Chưa có backend; endpoint/payload/status/error chưa xác minh | OPEN |
| API-06 | Accept/decline/cancel/end/report call | SRS §11.3 proposal | Chưa có backend; transition contract chưa xác minh | OPEN |
| API-07 | Realtime chat | Socket.IO /chat hiện tại | Backend `chat.socket.js` và chat service; `backend-contract.md` | VERIFIED |
| API-08 | Call/signaling events | SRS §12 proposal | Chưa có event, payload, ack hoặc phân quyền trong backend | OPEN |

## 6. Task decomposition

Task được phân rã từ ranh giới này sau khi Plan Quality Gate đạt PASS. API-dependent Phase chỉ được code khi contract liên quan VERIFIED; call API-05, API-06, API-08 còn OPEN.

<!-- table:decomp -->
| TASK | Boundary | REQ | Depends | Phases |
|---|---|---|---|---|
| TASK-01 | Đối chiếu và đóng gap chat P0 trên API/frontend hiện có | REQ-MSG-01, REQ-MSG-02, REQ-MSG-03, REQ-MSG-04, REQ-MSG-11 | none | 3 |
| TASK-02 | CallSession, ràng buộc và HTTP state machine | REQ-MSG-05, REQ-MSG-06, REQ-MSG-10, REQ-MSG-11 | TASK-01 | 4 |
| TASK-03 | Signaling có phân quyền, event/reconciliation | REQ-MSG-05, REQ-MSG-08, REQ-MSG-10, REQ-MSG-11 | TASK-02 | 3 |
| TASK-04 | WebRTC media, controls, call UI và nghiệm thu viewport | REQ-MSG-07, REQ-MSG-08, REQ-MSG-09, REQ-MSG-10, REQ-MSG-12 | TASK-03 | 4 |

## 7. Thứ tự triển khai

```text
PQG PASS → Task/Phase/TC → đối chiếu backend chat + đóng OQ-01 → check --gate1
→ Gate 1 → TASK-01 → thiết kế/kiểm chứng contract call → TASK-02 → TASK-03 → TASK-04 → build/thiết bị thật
```

## 8. Risk & mitigation

<!-- table:risk -->
| RISK | Risk | Level | Cause | Mitigation | Owner |
|---|---|---|---|---|---|
| RISK-01 | Lộ chat/call/signaling cho người ngoài | HIGH | Tin client ID hoặc broadcast sai room | Membership/resource auth mỗi command và negative integration TC | TASK-03 |
| RISK-02 | Hai call hoặc hai accept đồng thời | HIGH | Check rồi ghi không atomic; nhiều tab | DB transaction/atomic transition và race TC | TASK-02 |
| RISK-03 | Camera/micro vẫn chạy sau end/unmount | HIGH | Peer/track ownership và cleanup lỗi | Cleanup idempotent; device test và TC end/failure | TASK-04 |
| RISK-04 | Call treo sau disconnect/restart | HIGH | Timer chỉ ở client hoặc process memory | Timeout/reconciliation phía server; failure TC | TASK-02 |
| RISK-05 | Contract SRS proposal lệch route/field đang chạy | MED | Chat code đang dở và thiếu OpenAPI | Đối chiếu backend ở `backend-contract.md`; test HTTP thực trong TASK-01 | TASK-01 |
| RISK-06 | STUN-only không kết nối ở một số mạng | MED | NAT/firewall | Test mạng mục tiêu; quyết định TURN trước release, hiển thị failure rõ | TASK-04 |

## 9. Plan Quality Gate

- [x] REQ MVP P0 có gap và PlanSec; P1/P2 ngoài baseline được ghi rõ
- [x] Business rule chính đã map; giả định và OQ được nêu
- [x] Impact shared auth, data, socket, UI, test đã khảo sát
- [x] Hướng triển khai và ranh giới Task dự kiến đã ghi
- [x] Risk HIGH/MED có mitigation và owner dự kiến
- [x] API contract quan trọng được ghi OPEN rõ nguồn thiếu; Task/TC không đoán field, status hoặc error
- [x] PQG PASS để phân rã Task từ §6 theo yêu cầu người dùng
- [x] OQ-01 dùng backend làm nguồn chat theo chỉ đạo người dùng; call API còn OPEN theo từng Phase
