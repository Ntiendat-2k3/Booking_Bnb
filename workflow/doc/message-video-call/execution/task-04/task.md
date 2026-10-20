# TASK-04 — WebRTC media, điều khiển và call UI

- **Task ID:** TASK-04
- **REQ:** REQ-MSG-07, REQ-MSG-08, REQ-MSG-09, REQ-MSG-10, REQ-MSG-12
- **Depends:** TASK-03
- **Plan refs:** §4, §5.1, §5.3, §6 (TASK-04), §8 (RISK-03, RISK-06)
- **Single-phase reason:** -

## Scope

- **IN:** Browser media permission, WebRTC peer connection, local/remote video, mute/camera, cleanup, reconnect UX, responsive và accessibility.
- **OUT:** Recording, group call, screen share, chọn camera P2, TURN production khi chưa có quyết định hạ tầng.
- **Shared/conflict:** CallOverlay/useCallSession từ TASK-03; state media phải tách khỏi call state có thẩm quyền phía server.

## API

<!-- table:task-api -->
| API | Endpoint | Note |
|---|---|---|
| API-05 | Truy vấn call canonical | OPEN; dùng khi reload/reconnect |
| API-06 | End/report call theo contract được duyệt | OPEN; không đoán payload |
| API-08 | Socket.IO /chat signaling | OPEN; dùng offer/answer/ICE thật |

## Phases

### PH-04.1 — Permission, local tracks và peer setup

- **REQ:** REQ-MSG-07, REQ-MSG-08
- **BR:** BR-08, BR-09
- **API:** API-08
- **Gate3:** strict
- **Goal:** Sau accept và user action hợp lệ, xin media rồi thiết lập đúng một peer connection/call, buffer ICE sớm.
- **Input:** TASK-03 DONE; API-08 VERIFIED; browser/HTTPS hỗ trợ getUserMedia.
- **Target Files:**
  - `frontend/src/features/chat/hooks/useWebRTCCall.js`
  - `frontend/src/features/chat/hooks/useCallSession.js`
  - `frontend/src/features/chat/components/CallOverlay.jsx`
  - `frontend/.env.example`
  - `frontend/tests/call.test.mjs`
- **Steps:**
  1. Kiểm secure context/API và yêu cầu camera/micro sau hành động user; phân loại denied/no device/busy/unsupported.
  2. Cho lựa chọn audio-only hoặc hủy khi thiếu camera theo default SRS; không giả video track đang tồn tại.
  3. Tạo peer connection sau accepted, ICE config qua environment, offer/answer đúng signaling state và buffer candidate đến trước remote description.
- **Out of phase:** Không thêm recording hoặc tự bật lại camera người dùng đã tắt.
- **DoD:** Media chỉ bật sau action/permission; lỗi thiết bị có đường thoát rõ; một call chỉ có một peer connection và ICE sớm áp dụng đúng theo TC-04.1-*.

### PH-04.2 — Video, mute, camera và cleanup

- **REQ:** REQ-MSG-09, RISK-03
- **BR:** BR-10
- **API:** API-06
- **Gate3:** strict
- **Goal:** Track/UI khớp và end/unmount/terminal event giải phóng toàn bộ tài nguyên app sở hữu.
- **Input:** PH-04.1 DONE; API-06 VERIFIED.
- **Target Files:**
  - `frontend/src/features/chat/hooks/useWebRTCCall.js`
  - `frontend/src/features/chat/hooks/useCallSession.js`
  - `frontend/src/features/chat/components/CallOverlay.jsx`
  - `frontend/src/features/chat/api/chatApi.js`
  - `frontend/tests/call.test.mjs`
- **Steps:**
  1. Gắn local/remote stream, placeholder khi chưa có video và playsInline; xử lý autoplay bị chặn.
  2. Mute/unmute và camera on/off dựa vào track thực, xử lý track ended hoặc quyền bị thu hồi.
  3. End gửi command đã xác minh; dù HTTP/event lỗi vẫn close peer, stop local tracks, gỡ listeners/timers và xóa ICE queue theo ownership.
- **Out of phase:** Không dừng track thuộc module khác hoặc dùng icon như nguồn trạng thái media.
- **DoD:** Hai phía xem/nghe đúng; toggles khớp track; sau end/terminal/unmount camera và micro app tạo đều tắt theo TC-04.2-*.

### PH-04.3 — Media reconnect, timeout và mạng khó

- **REQ:** REQ-MSG-08, REQ-MSG-10, RISK-06
- **BR:** BR-09, BR-11
- **API:** API-05, API-08
- **Gate3:** strict
- **Goal:** UI và peer xử lý disconnected/failed có giới hạn, reconcile với server, báo lỗi rõ nếu không thể kết nối.
- **Input:** PH-04.2 DONE; API-05 và API-08 VERIFIED; grace period từ TASK-02.
- **Target Files:**
  - `frontend/src/features/chat/hooks/useWebRTCCall.js`
  - `frontend/src/features/chat/hooks/useCallSession.js`
  - `frontend/src/features/chat/components/CallOverlay.jsx`
  - `frontend/tests/call.test.mjs`
- **Steps:**
  1. Theo dõi RTCPeerConnection connection/ICE state riêng socket state; không end media vì socket rớt tạm.
  2. Khi media mất, hiển thị reconnecting; phục hồi có giới hạn trong grace hoặc chuyển terminal canonical.
  3. Kiểm STUN-only trên mạng mục tiêu, failure rõ khi không có đường ICE; không cam kết mạng nào cũng kết nối.
- **Out of phase:** Không tự triển khai TURN hoặc ICE restart lặp vô hạn.
- **DoD:** Mất mạng tạm phục hồi hoặc kết thúc có lý do; reload không tạo media giả; STUN failure có trạng thái rõ theo TC-04.3-*.

### PH-04.4 — Responsive, accessibility và thiết bị mục tiêu

- **REQ:** REQ-MSG-07, REQ-MSG-09, REQ-MSG-12
- **BR:** BR-08, BR-10, BR-13
- **API:** none
- **Gate3:** strict
- **Goal:** Call UI dùng được bằng keyboard và trên desktop/tablet/mobile với loading/empty/error/unsupported rõ.
- **Input:** PH-04.3 DONE; OQ-02 đã chọn mobile browser nghiệm thu.
- **Target Files:**
  - `frontend/src/features/chat/components/CallOverlay.jsx`
  - `frontend/src/features/chat/components/ConversationView.jsx`
  - `frontend/src/app/globals.css`
  - `frontend/src/i18n/vn.json`
  - `frontend/src/i18n/en.json`
  - `frontend/tests/call.test.mjs`
- **Steps:**
  1. Dùng component/label/focus convention hiện có cho incoming, accept, decline, mute, camera và end; trạng thái không chỉ bằng màu.
  2. Kiểm viewport portrait/landscape, safe area, local preview và remote placeholder; giữ chat usable khi call lỗi.
  3. Test Chrome desktop và mobile browser đã chọn, keyboard focus, permission/unsupported và cleanup thiết bị thật.
- **Out of phase:** Không redesign chat ngoài yêu cầu call và không thêm tính năng P1/P2.
- **DoD:** Controls không bị che, có nhãn/focus và dịch đủ hai locale; manual evidence trên desktop/mobile và permission failure theo TC-04.4-*.
