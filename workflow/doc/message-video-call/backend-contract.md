# Contract chat hiện có — đối chiếu backend ngày 2026-10-20

Tài liệu này ghi **hành vi đang được mã backend định nghĩa**, theo chỉ đạo dùng backend thay cho Swagger/OpenAPI. Nó không xác nhận call API chưa tồn tại. Khi mã và tài liệu khác nhau, kiểm lại route/schema/controller/service trước khi sửa baseline.

## Quy ước chung

- Base route: `/api/v1/chat` qua `backend/routes/api.js` và `backend/routes/v1/chat.routes.js`.
- Mọi route dùng `auth.middleware.js`: cookie access hoặc Bearer, user phải active và session phải còn hiệu lực; response có `Cache-Control: private, no-store`.
- Ghi dữ liệu dùng CSRF và rate limit 30 yêu cầu/phút/user ở các route đã khai báo; không áp dụng mặc định cho mọi GET.
- Thành công: `{ status: "success", message, data }` từ `backend/utils/response.js`; send trả HTTP 201, các handler chat khác dùng mặc định 200.
- Lỗi ứng dụng: `{ status: "error", message, errors }`; Joi trả HTTP 400 và lỗi từng field, auth trả 401/403, resource membership 404. Rate limiter do Express middleware trả, không suy ra cùng envelope nếu chưa test HTTP thật.

## HTTP chat

| Method/path | Input đã kiểm tra | Data khi thành công | Source |
|---|---|---|---|
| GET `/socket-ticket` | Auth; rate limit | `{ ticket }` dùng handshake Socket.IO, vé 45 giây | `chat.controller.js`, `chat.socket-ticket.js` |
| GET `/unread` | Auth | `{ count }` | `chat.controller.js`, `chat.repository.js` |
| GET `/` | `search` trim tối đa 100, mặc định rỗng; `page` 1..100000 mặc định 1; `limit` 1..50 mặc định 20 | `{ items, hasMore, page }`; item có `id, kind, created_at, last_activity_at, other_id, other_read_sequence, other_name, other_avatar, last_message_id, last_message_type, last_message_body, last_message_at, unread_count, other_online` | `chat.schema.js`, `chat.service.js`, `chat.repository.js` |
| POST `/listings/:listingId` | UUID listing; CSRF; rate limit; listing published, host active, không phải listing của chính mình | Summary của conversation direct; tạo `shared_context` listing một lần theo key | `chat.routes.js`, `chat.adapter.js`, `chat.service.js` |
| GET `/:conversationId` | UUID; member | Summary cùng hình dạng list item | `chat.service.js`, `chat.repository.js` |
| GET `/:conversationId/messages` | UUID; member; `before` là số nguyên dương tối đa signed 64-bit; `limit` 1..50 mặc định 30 | `{ items, hasMore, nextCursor }`; items theo sequence tăng dần, cursor là sequence dạng string hoặc null | `chat.schema.js`, `chat.repository.js` |
| POST `/:conversationId/messages` | UUID; member; CSRF; rate limit; `{ body: string, client_key: UUID v4 }`; body trim 1..4000 | HTTP 201 với ChatMessage canonical, gồm `id, sequence, conversation_id, sender_id, type, body, context, client_key, created_at`; retry cùng key trả row cũ, key trùng nhưng body/hội thoại khác trả 409 | `chat.schema.js`, `chat.service.js`, `chat.repository.js` |
| PATCH `/:conversationId/read` | UUID; member; CSRF; rate limit; `{ message_id: UUID }` thuộc conversation | `{ sequence }`; cursor chỉ tiến lên | `chat.schema.js`, `chat.service.js`, `chat.repository.js` |

`other_avatar`, các field `last_message_*`, `context`, `body` và `nextCursor` có thể null theo SQL/model và đường dữ liệu. `items` có thể rỗng. Test HTTP thực phải xác nhận serialization và lỗi 429 trước khi coi các chi tiết đó là bằng chứng runtime.

## Realtime chat

- Socket.IO namespace `/chat`, path `/socket.io`, transport websocket. Handshake dùng ticket ngắn hạn hoặc access cookie; server xác minh user active và session còn sống rồi join room `user:<userId>`. Không có lệnh client tự join conversation room.
- Server phát `chat:message` với ChatMessage canonical sau commit; `chat:conversation` với `{ id }` khi tạo direct conversation; `chat:read` với `{ conversation_id, user_id, sequence }`; `chat:presence` với `{ user_id, online }` chỉ cho peer có hội thoại.
- Mất socket không xóa message. Client tải lại list/history từ HTTP khi reconnect.
- Source: `backend/services/chat.socket.js`, `backend/services/chat.service.js`, `backend/tests/chat.test.js`, `backend/tests/chat.integration.test.js`.

## Chưa có trong backend

Không có model/repository/service/route cho CallSession, HTTP create/accept/decline/cancel/end/report hoặc event offer/answer/ICE. Các mục này trong SRS §11–12 là **đề xuất**, tiếp tục để `OPEN` và chưa được dùng làm contract triển khai.
