# TC — TASK-03

API-05 và API-08 đang OPEN. Tên event, ack và lỗi chỉ được điền vào assertion sau khi có contract thật; testcase hiện mô tả quyền, đích phát và trạng thái quan sát được.

<!-- table:tc -->
| TC | Trace | BR | API | Type | Verify | Scenario | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| TC-03.1-01 | REQ-MSG-05 | BR-05 | API-05, API-08 | Integration | manual | Given caller và callee đăng nhập ở hai trang khác nhau / When caller tạo call / Then chỉ callee thấy incoming đúng danh tính và caller thấy ringing | UNTESTED | - |
| TC-03.1-02 | REQ-MSG-05, REQ-MSG-11, RISK-01 | BR-05, BR-12 | API-08 | Negative | cmd:node --test backend/tests/call.test.js | Given user thứ ba hoặc socket chưa xác thực / When call được tạo / Then không nhận incoming/state event hay caller metadata | UNTESTED | - |
| TC-03.1-03 | REQ-MSG-05 | BR-05 | API-08 | Boundary | manual | Given callee mở hai tab / When incoming rồi caller cancel hoặc call terminal / Then hai tab đồng bộ đóng incoming, không mở hai call active | UNTESTED | - |
| TC-03.1-04 | REQ-MSG-11 | BR-12 | API-08 | Positive | cmd:node --test backend/tests/call.test.js | Given socket có session sống / When phát call event / Then server chỉ dùng user room đã xác thực và payload chỉ có dữ liệu cần thiết | UNTESTED | - |
| TC-03.2-01 | REQ-MSG-08 | BR-09 | API-08 | Integration | cmd:node --test backend/tests/call.test.js | Given call accepted với hai participant / When offer, answer và ICE hợp lệ được gửi / Then chỉ peer còn lại nhận đúng callId | UNTESTED | - |
| TC-03.2-02 | REQ-MSG-08, REQ-MSG-11, RISK-01 | BR-09, BR-12 | API-08 | Negative | cmd:node --test backend/tests/call.test.js | Given outsider biết callId hoặc client giả userId / When gửi signaling / Then server từ chối và không relay payload | UNTESTED | - |
| TC-03.2-03 | REQ-MSG-08, REQ-MSG-11 | BR-09, BR-12 | API-08 | Boundary | cmd:node --test backend/tests/call.test.js | Given signaling sai schema, quá kích thước hoặc vượt tốc độ / When gửi / Then server từ chối theo contract và không log raw SDP/ICE | UNTESTED | - |
| TC-03.2-04 | REQ-MSG-08 | BR-09 | API-08 | Negative | cmd:node --test backend/tests/call.test.js | Given call đã terminal hoặc chưa được accept / When ICE/offer đến trễ / Then không relay và call không quay active | UNTESTED | - |
| TC-03.3-01 | REQ-MSG-10 | BR-11 | API-05, API-08 | Integration | manual | Given call active và socket tạm disconnect trong khi media còn / When socket reconnect / Then client tải state canonical và không tạo call mới | UNTESTED | - |
| TC-03.3-02 | REQ-MSG-08, REQ-MSG-10 | BR-09, BR-11 | API-05, API-08 | Boundary | cmd:node --test frontend/tests/chat.test.mjs | Given event accepted/terminal bị lặp hoặc sai thứ tự / When client reconcile theo callId/state server / Then chỉ một call UI và terminal không bị hồi sinh | UNTESTED | - |
| TC-03.3-03 | REQ-MSG-10 | BR-11 | API-05, API-08 | Negative | manual | Given tab reload trong call và peer connection cũ mất / When trang tải lại / Then hiển thị state server hoặc terminal rõ, không giả media đã connected | UNTESTED | - |
| TC-03.3-04 | REQ-MSG-11 | BR-12 | API-05, API-08 | Negative | cmd:node --test backend/tests/call.test.js | Given token/socket hết hạn sau reconnect / When xin state hoặc signaling mới / Then bị từ chối và không phát dữ liệu call | UNTESTED | - |
