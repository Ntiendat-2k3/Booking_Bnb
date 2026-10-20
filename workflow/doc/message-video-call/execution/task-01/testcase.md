# TC — TASK-01

TC bám hành vi SRS và Phase; API-01–04 và API-07 đã đối chiếu với backend trong `backend-contract.md`. Các chi tiết serialization và lỗi chưa xác nhận bằng HTTP thực phải được kiểm tra trong Phase; không diễn giải câu “theo contract” thành mã lỗi tự đặt.

<!-- table:tc -->
| TC | Trace | BR | API | Type | Verify | Scenario | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| TC-01.1-01 | REQ-MSG-01, REQ-MSG-02 | BR-01, BR-02 | API-01, API-02 | Integration | cmd:node --test backend/tests/chat.integration.test.js | Given customer và listing published có host active / When contact hai lần / Then cùng conversation hiện trong list của hai participant một lần | UNTESTED | - |
| TC-01.1-02 | REQ-MSG-01, REQ-MSG-11 | BR-01, BR-12 | API-02 | Negative | cmd:node --test backend/tests/chat.integration.test.js | Given guest, chủ listing hoặc listing không hợp lệ / When contact / Then bị từ chối theo contract và không tạo conversation | UNTESTED | - |
| TC-01.1-03 | REQ-MSG-02 | BR-02 | API-01 | Positive | cmd:node --test backend/tests/chat.integration.test.js | Given nhiều hội thoại và một hội thoại chưa có message / When tải list nhiều trang / Then thứ tự hoạt động, preview rỗng và hasMore đúng dữ liệu server | UNTESTED | - |
| TC-01.1-04 | REQ-MSG-02, REQ-MSG-11 | BR-02, BR-12 | API-01 | Negative | cmd:node --test backend/tests/chat.integration.test.js | Given outsider biết conversation ID / When mở detail hoặc list / Then không lộ metadata hay hội thoại ngoài quyền | UNTESTED | - |
| TC-01.1-05 | REQ-MSG-01, RISK-05 | BR-01 | API-01, API-02 | Boundary | manual | Given `backend-contract.md` và route đang chạy / When đối chiếu path, field, nullable, envelope và lỗi / Then Phase chỉ dùng contract thật và mọi khác biệt được ghi trước code | UNTESTED | - |
| TC-01.2-01 | REQ-MSG-02, REQ-MSG-03 | BR-02, BR-03 | API-03 | Integration | cmd:node --test backend/tests/chat.integration.test.js | Given member gửi text hợp lệ / When đọc lại history sau request mới / Then có một message canonical với ID, timestamp và sequence server đúng thứ tự | UNTESTED | - |
| TC-01.2-02 | REQ-MSG-03 | BR-03 | API-03 | Negative | cmd:node --test backend/tests/chat.integration.test.js | Given text rỗng hoặc chỉ whitespace / When gửi / Then bị từ chối theo contract và DB không thêm row | UNTESTED | - |
| TC-01.2-03 | REQ-MSG-03 | BR-03 | API-03 | Boundary | cmd:node --test backend/tests/chat.integration.test.js | Given text ngay ngưỡng và vượt ngưỡng đã duyệt / When gửi / Then chỉ text trong giới hạn được lưu sau trim | UNTESTED | - |
| TC-01.2-04 | REQ-MSG-03 | BR-03 | API-03 | Integration | cmd:node --test backend/tests/chat.integration.test.js | Given server đã lưu nhưng client mất response / When retry cùng client key / Then trả message cũ và DB/event không có bản thứ hai | UNTESTED | - |
| TC-01.2-05 | REQ-MSG-02, REQ-MSG-11 | BR-02, BR-12 | API-03 | Negative | cmd:node --test backend/tests/chat.integration.test.js | Given outsider biết ID hội thoại / When đọc history hoặc gửi / Then bị từ chối, không đọc nội dung và không ghi message | UNTESTED | - |
| TC-01.3-01 | REQ-MSG-04 | BR-04 | API-07 | Integration | manual | Given hai participant có socket hợp lệ / When một bên gửi text / Then bên kia nhận một event và thấy message mà không refresh | UNTESTED | - |
| TC-01.3-02 | REQ-MSG-03, REQ-MSG-04 | BR-03, BR-04 | API-03, API-07 | Boundary | cmd:node --test frontend/tests/chat.test.mjs | Given pending message và response/event lặp hoặc đảo thứ tự / When merge / Then chỉ còn một bản canonical, failed có thể retry cùng key | UNTESTED | - |
| TC-01.3-03 | REQ-MSG-02, REQ-MSG-04 | BR-02, BR-04 | API-01, API-03, API-04, API-07 | Integration | manual | Given recipient đang ở trang khác và sau đó mất socket / When có message rồi reconnect / Then preview, unread, history được tải bù từ HTTP không nhân đôi | UNTESTED | - |
| TC-01.3-04 | REQ-MSG-04 | BR-04 | API-07 | Negative | cmd:node --test backend/tests/chat.test.js | Given socket guest/outsider hoặc phiên hết hạn / When kết nối hay chờ event riêng tư / Then không nhận message của hội thoại | UNTESTED | - |
| TC-01.3-05 | REQ-MSG-04 | BR-04 | API-03, API-07 | Negative | manual | Given realtime hoặc network lỗi / When mở chat và thử gửi / Then lịch sử HTTP còn tải được khi mạng phục hồi, tin chưa xác nhận hiện failed thay vì sent | UNTESTED | - |
