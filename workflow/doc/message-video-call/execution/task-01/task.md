# TASK-01 — Đóng gap chat P0 trên luồng hiện có

- **Task ID:** TASK-01
- **REQ:** REQ-MSG-01, REQ-MSG-02, REQ-MSG-03, REQ-MSG-04, REQ-MSG-11
- **Depends:** none
- **Plan refs:** §2, §4, §5.1, §5.3, §6 (TASK-01), §8 (RISK-05)
- **Single-phase reason:** -

## Scope

- **IN:** Xác minh và hoàn thiện contact host, list/history/send, socket chat và UI reconcile theo contract được duyệt; giữ route/field đang hoạt động nếu contract xác nhận.
- **OUT:** CallSession, signaling call, media, booking entrypoint mới khi OQ-04 chưa yêu cầu, redesign chat.
- **Shared/conflict:** Auth, CSRF, chat service/repository/socket và message UI đang có thay đổi chưa commit. Trước khi sửa từng symbol phải chạy GitNexus impact; không ghi đè phần người dùng đang làm.

## API

<!-- table:task-api -->
| API | Endpoint | Note |
|---|---|---|
| API-01 | GET /api/v1/chat và GET /api/v1/chat/:id | VERIFIED từ backend; xem `backend-contract.md` |
| API-02 | POST /api/v1/chat/listings/:listingId | VERIFIED từ backend; xem `backend-contract.md` |
| API-03 | GET/POST /api/v1/chat/:id/messages | VERIFIED từ backend; xem `backend-contract.md` |
| API-04 | PATCH /api/v1/chat/:id/read và GET /api/v1/chat/unread và GET /api/v1/chat/socket-ticket | VERIFIED từ backend; xem `backend-contract.md` |
| API-07 | Socket.IO /chat | VERIFIED từ backend; chỉ map event chat thật |

## Phases

### PH-01.1 — Quyền liên hệ và danh sách hội thoại

- **REQ:** REQ-MSG-01, REQ-MSG-02, REQ-MSG-11, RISK-05
- **BR:** BR-01, BR-02, BR-12
- **API:** API-01, API-02
- **Gate3:** strict
- **Goal:** Chỉ user hợp lệ mở và xem hội thoại của mình; lặp contact không tạo conversation trùng.
- **Input:** API-01 và API-02 VERIFIED; môi trường test có listing published, host active và user ngoài hội thoại.
- **Target Files:**
  - `backend/integrations/booking/chat.adapter.js`
  - `backend/services/chat.service.js`
  - `backend/repositories/chat.repository.js`
  - `backend/routes/v1/chat.routes.js`
  - `backend/controllers/api/v1/chat.controller.js`
  - `backend/tests/chat.integration.test.js`
- **Steps:**
  1. Đối chiếu request/response/auth thật với code đang chạy; giữ chính sách contact listing và unique direct pair từ Plan §5.
  2. Chỉ sửa gap được chứng minh ở contact/list/detail; kiểm tra account active, membership, list pagination và empty preview.
  3. Test hai request contact đồng thời, guest và outsider; ghi nhận khác biệt contract nếu có trước khi code.
- **Out of phase:** Không thêm quyền admin, booking entrypoint hoặc đổi SRS proposal thành endpoint thật.
- **DoD:** Contact hợp lệ trả cùng một hội thoại khi gọi lặp; outsider không thấy metadata/list; list phân trang và empty state có chứng cứ integration theo TC-01.1-*.

### PH-01.2 — Lịch sử, text và idempotency

- **REQ:** REQ-MSG-02, REQ-MSG-03, REQ-MSG-11
- **BR:** BR-02, BR-03, BR-12
- **API:** API-03
- **Gate3:** strict
- **Goal:** History và send text bền vững, đúng thứ tự, validate và không duplicate khi retry.
- **Input:** PH-01.1 DONE; API-03 VERIFIED; giới hạn độ dài được chốt theo contract.
- **Target Files:**
  - `backend/requests/api/v1/chat.schema.js`
  - `backend/services/chat.service.js`
  - `backend/repositories/chat.repository.js`
  - `backend/tests/chat.test.js`
  - `backend/tests/chat.integration.test.js`
- **Steps:**
  1. Đối chiếu schema text/history và response canonical với contract; giữ sequence server và client key hiện có nếu hợp lệ.
  2. Đóng gap validation, idempotency và authorization tại service/repository thay vì vá ở client.
  3. Chạy test persistence sau đọc lại DB, retry mất response, empty/whitespace/quá giới hạn và outsider.
- **Out of phase:** Không thêm sửa/xóa tin, file, image hoặc thay đổi message type `shared_context` hiện hữu.
- **DoD:** Một key retry chỉ có một row và một event; message hợp lệ còn sau tải lại; nội dung không hợp lệ/outsider không ghi DB theo TC-01.2-*.

### PH-01.3 — Realtime và reconcile UI chat

- **REQ:** REQ-MSG-02, REQ-MSG-03, REQ-MSG-04
- **BR:** BR-02, BR-03, BR-04
- **API:** API-01, API-03, API-04, API-07
- **Gate3:** strict
- **Goal:** UI giữ một bản message canonical, cập nhật preview/unread và tải bù sau reconnect.
- **Input:** PH-01.2 DONE; API-01, API-03, API-04 và API-07 VERIFIED.
- **Target Files:**
  - `backend/services/chat.socket.js`
  - `frontend/src/features/chat/api/chatApi.js`
  - `frontend/src/features/chat/hooks/useChatSocket.js`
  - `frontend/src/features/chat/hooks/useConversations.js`
  - `frontend/src/features/chat/hooks/useMessages.js`
  - `frontend/src/features/chat/utils/mergeMessage.mjs`
  - `frontend/src/features/chat/components/ChatLayout.jsx`
  - `frontend/src/features/chat/components/ConversationView.jsx`
  - `frontend/tests/chat.test.mjs`
  - `backend/tests/chat.test.js`
- **Steps:**
  1. Reuse socket auth/user room hiện có; kiểm tra event chỉ tới participant và không nhận userId tự khai.
  2. Reconcile pending/failed với response/event canonical; reload list/history sau reconnect, chống event lặp/sai thứ tự.
  3. Kiểm tra loading/empty/network/auth đúng contract, read/unread đang có không bị thoái lui.
- **Out of phase:** Không tạo socket command gửi message thứ hai, typing hoặc archive.
- **DoD:** Hai session trao đổi được; sau offline/reconnect không mất hoặc nhân đôi tin; socket outsider không nhận event theo TC-01.3-*.
