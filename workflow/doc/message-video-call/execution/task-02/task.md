# TASK-02 — CallSession và HTTP state machine

- **Task ID:** TASK-02
- **REQ:** REQ-MSG-05, REQ-MSG-06, REQ-MSG-10, REQ-MSG-11
- **Depends:** TASK-01
- **Plan refs:** §4, §5.1, §5.3, §6 (TASK-02), §8 (RISK-02, RISK-04)
- **Single-phase reason:** -

## Scope

- **IN:** Persist metadata CallSession, giới hạn active call, các command HTTP có phân quyền, atomic transition, server timeout và reconcile sau restart.
- **OUT:** SDP/ICE/media, call UI và lưu audio/video.
- **Shared/conflict:** Reuse chat membership/auth/CSRF; route và service chat đang dở. Target file chỉ là ranh giới Phase, contract call thật phải VERIFIED trước code.

## API

<!-- table:task-api -->
| API | Endpoint | Note |
|---|---|---|
| API-05 | Tạo và truy vấn call theo contract được duyệt | OPEN; SRS §11.3 chỉ proposal |
| API-06 | Accept/decline/cancel/end/report theo contract được duyệt | OPEN; chưa chốt payload và lỗi |

## Phases

### PH-02.1 — Mô hình CallSession và ràng buộc active

- **REQ:** REQ-MSG-05, REQ-MSG-06, REQ-MSG-11, RISK-02
- **BR:** BR-05, BR-07, BR-12
- **API:** none
- **Gate3:** strict
- **Goal:** Lưu call metadata có transition terminal bất biến và tối đa một active call/user hoặc conversation khi cạnh tranh.
- **Input:** TASK-01 DONE; đối chiếu schema PostgreSQL/Sequelize và model chat hiện có.
- **Target Files:**
  - `backend/models/call_session.js`
  - `backend/models/index.js`
  - `backend/migrations/`
  - `backend/repositories/call.repository.js`
  - `backend/tests/call.integration.test.js`
- **Steps:**
  1. Tạo bảng/model metadata theo Plan §5, khóa ngoại vào conversation/user, thời điểm server và ràng buộc active phù hợp PostgreSQL.
  2. Đặt thao tác create/transition trong transaction/atomic update; không dùng trạng thái React làm nguồn.
  3. Test hai create đồng thời, cùng user ở hai conversation, terminal không quay active và rollback migration.
- **Out of phase:** Không lưu SDP/ICE, raw media hay CallParticipantState khi chưa chứng minh cần thiết.
- **DoD:** DB không tồn tại hai active call xung đột; terminal không tái kích hoạt; migration lên/xuống kiểm chứng được theo TC-02.1-*.

### PH-02.2 — Tạo, xem và xác thực call

- **REQ:** REQ-MSG-05, REQ-MSG-11
- **BR:** BR-05, BR-12
- **API:** API-05
- **Gate3:** strict
- **Goal:** Participant hợp lệ tạo/truy vấn call; caller/callee lấy từ auth và conversation, không từ field giả mạo.
- **Input:** PH-02.1 DONE; API-05 VERIFIED.
- **Target Files:**
  - `backend/routes/v1/chat.routes.js`
  - `backend/controllers/api/v1/chat.controller.js`
  - `backend/requests/api/v1/chat.schema.js`
  - `backend/services/call.service.js`
  - `backend/repositories/call.repository.js`
  - `backend/tests/call.test.js`
  - `backend/tests/call.integration.test.js`
- **Steps:**
  1. Map endpoint, envelope và lỗi thật; dùng auth/CSRF/rate-limit convention của chat cho thao tác ghi.
  2. Kiểm membership, người kia còn active, self-call, call active xung đột trước và trong transaction.
  3. Trả state canonical tối thiểu; kiểm auth, outsider, resource không tồn tại và nullable theo contract.
- **Out of phase:** Không phát signaling hoặc tạo media.
- **DoD:** Caller hợp lệ nhận call canonical; guest/outsider/target giả mạo bị từ chối mà không lộ metadata; xung đột không tạo row active thứ hai theo TC-02.2-*.

### PH-02.3 — Atomic accept, decline, cancel và end

- **REQ:** REQ-MSG-06, REQ-MSG-11, RISK-02
- **BR:** BR-06, BR-07, BR-12
- **API:** API-06
- **Gate3:** strict
- **Goal:** Mỗi command chỉ đổi trạng thái hợp lệ một lần và trả trạng thái canonical khi race.
- **Input:** PH-02.2 DONE; API-06 VERIFIED.
- **Target Files:**
  - `backend/routes/v1/chat.routes.js`
  - `backend/controllers/api/v1/chat.controller.js`
  - `backend/requests/api/v1/chat.schema.js`
  - `backend/services/call.service.js`
  - `backend/repositories/call.repository.js`
  - `backend/tests/call.test.js`
  - `backend/tests/call.integration.test.js`
- **Steps:**
  1. Mã hóa transition theo SRS §7.1; kiểm actor và state tại thời điểm ghi atomic.
  2. Xử lý hai tab cùng accept, accept so với cancel/timeout, end lặp; không để nhiều media owner từ cùng call.
  3. Ghi endedAt/endReason theo transition thắng; không coi retry lệnh đã terminal là thành công mới.
- **Out of phase:** Không phát event chưa VERIFIED và không để client tự cập nhật status DB.
- **DoD:** Race chỉ có một kết quả có hiệu lực; transition sai bị từ chối theo contract; end idempotent; người ngoài không đổi call theo TC-02.3-*.

### PH-02.4 — Server timeout và reconcile sau restart

- **REQ:** REQ-MSG-06, REQ-MSG-10, RISK-04
- **BR:** BR-07, BR-11
- **API:** API-05, API-06
- **Gate3:** strict
- **Goal:** Ringing và connecting/reconnecting không treo vô hạn khi browser đóng hoặc backend restart.
- **Input:** PH-02.3 DONE; API-05 và API-06 VERIFIED; ring timeout 40 giây và grace 15 giây theo default SRS nếu contract không đổi.
- **Target Files:**
  - `backend/services/call.service.js`
  - `backend/repositories/call.repository.js`
  - `backend/jobs/backgroundJobs.js`
  - `backend/.env.example`
  - `backend/tests/call.integration.test.js`
- **Steps:**
  1. Reconcile các call quá hạn bằng thời gian server, không phụ thuộc timer của tab; dùng lifecycle job hiện có.
  2. Giữ quyền chuyển terminal nguyên tử để timeout không thắng accept/end đã commit.
  3. Test khởi động lại process, caller offline, reconnect trong/hết grace và truy vấn state canonical.
- **Out of phase:** Không cam kết khôi phục peer connection cũ sau reload.
- **DoD:** Quá ring timeout thành no_answer đúng một lần; call mất kết nối hết grace thành terminal; restart không để active vô hạn theo TC-02.4-*.
