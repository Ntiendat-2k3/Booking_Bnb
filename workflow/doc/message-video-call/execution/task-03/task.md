# TASK-03 — Signaling có phân quyền và đồng bộ call

- **Task ID:** TASK-03
- **REQ:** REQ-MSG-05, REQ-MSG-08, REQ-MSG-10, REQ-MSG-11
- **Depends:** TASK-02
- **Plan refs:** §4, §5.1, §5.3, §6 (TASK-03), §8 (RISK-01)
- **Single-phase reason:** -

## Scope

- **IN:** Incoming/state event và command signaling qua socket auth hiện có, phân quyền call participant, UI incoming/start cơ bản và reconcile event sau reconnect.
- **OUT:** Tạo peer connection, xin camera/micro, remote video và media controls.
- **Shared/conflict:** Namespace `/chat` và `useChatSocket` đang phục vụ chat; bảo toàn các chat event. Không tạo room do client tự chọn.

## API

<!-- table:task-api -->
| API | Endpoint | Note |
|---|---|---|
| API-05 | Truy vấn call canonical | OPEN; dùng khi reconnect |
| API-08 | Socket.IO /chat và call/signaling events | OPEN; tên event/ack phải xác minh |

## Phases

### PH-03.1 — Incoming call và state event đúng người

- **REQ:** REQ-MSG-05, REQ-MSG-11, RISK-01
- **BR:** BR-05, BR-12
- **API:** API-05, API-08
- **Gate3:** strict
- **Goal:** Caller tạo call qua HTTP và callee nhận incoming ở mọi trang trong website khi online, không lộ tới user thứ ba.
- **Input:** TASK-02 DONE; API-05 và API-08 VERIFIED.
- **Target Files:**
  - `backend/services/call.service.js`
  - `backend/services/chat.socket.js`
  - `frontend/src/features/chat/api/chatApi.js`
  - `frontend/src/features/chat/hooks/useChatSocket.js`
  - `frontend/src/features/chat/hooks/useCallSession.js`
  - `frontend/src/features/chat/components/ConversationView.jsx`
  - `frontend/src/features/chat/components/CallOverlay.jsx`
  - `frontend/src/components/Providers.jsx`
  - `backend/tests/call.test.js`
  - `frontend/tests/chat.test.mjs`
- **Steps:**
  1. Reuse user room và xác thực socket; phát incoming/state từ call canonical sau commit.
  2. Dùng vị trí mount global hiện có để callee ở trang khác vẫn thấy incoming; ConversationView chỉ khởi tạo call khi user bấm video.
  3. Hiển thị caller summary, trạng thái ringing và action accept/decline/cancel theo contract; không xin media tại Phase này.
  4. Kiểm nhiều tab nhận cùng event và outsider không nhận payload.
- **Out of phase:** Không bật camera/micro, không tạo UI lịch sử cuộc gọi.
- **DoD:** Chỉ callee thấy incoming; caller thấy ringing; cancel/terminal đóng UI ở các tab; outsider không nhận event theo TC-03.1-*.

### PH-03.2 — Offer, answer và ICE được kiểm quyền

- **REQ:** REQ-MSG-08, REQ-MSG-11, RISK-01
- **BR:** BR-09, BR-12
- **API:** API-08
- **Gate3:** strict
- **Goal:** Server chuyển signaling giữa đúng hai participant của call active, có validate payload và chống spam.
- **Input:** PH-03.1 DONE; API-08 VERIFIED và state call từ TASK-02.
- **Target Files:**
  - `backend/services/chat.socket.js`
  - `backend/services/call.service.js`
  - `backend/requests/api/v1/chat.schema.js`
  - `backend/tests/call.test.js`
  - `backend/tests/call.integration.test.js`
- **Steps:**
  1. Xác minh sender từ socket auth và callId ở DB cho mỗi offer/answer/ICE; không nhận userId/calleeId tự khai.
  2. Validate hình dạng/kích thước payload và giới hạn tần suất; không log raw SDP/ICE.
  3. Chuyển event tới peer hợp lệ; bỏ qua hoặc từ chối sau terminal và khi state không cho phép.
- **Out of phase:** Không lưu signaling payload lâu dài và không tạo browser peer connection.
- **DoD:** Peer hợp lệ nhận offer/answer/ICE; outsider, payload sai/quá cỡ, rate limit và event sau terminal bị xử lý an toàn theo TC-03.2-*.

### PH-03.3 — Reconcile socket reconnect, reload và event lặp

- **REQ:** REQ-MSG-08, REQ-MSG-10, REQ-MSG-11
- **BR:** BR-09, BR-11, BR-12
- **API:** API-05, API-08
- **Gate3:** strict
- **Goal:** Client đồng bộ state canonical sau reconnect/reload, không tạo call hoặc media session thứ hai từ event lặp.
- **Input:** PH-03.2 DONE; API-05 và API-08 VERIFIED.
- **Target Files:**
  - `backend/services/chat.socket.js`
  - `frontend/src/features/chat/api/chatApi.js`
  - `frontend/src/features/chat/hooks/useChatSocket.js`
  - `frontend/src/features/chat/hooks/useCallSession.js`
  - `frontend/src/features/chat/components/CallOverlay.jsx`
  - `frontend/tests/chat.test.mjs`
  - `backend/tests/call.test.js`
- **Steps:**
  1. Sau reconnect truy vấn call canonical và dedupe event theo callId/state server.
  2. Khi reload, hiển thị state hiện tại hoặc terminal rõ; không hứa giữ peer connection cũ.
  3. Phân biệt socket connection với media connection; call active chỉ terminal theo policy TASK-02.
- **Out of phase:** Không tự ICE restart hoặc tái tạo media ở Phase signaling.
- **DoD:** Event lặp/sai thứ tự không sinh nhiều call UI; reconnect/reload lấy state đúng; socket mất tạm không end call đang có media theo TC-03.3-*.
