# TC — TASK-04

API-05, API-06 và API-08 đang OPEN. Manual cases yêu cầu ghi browser/device, môi trường HTTPS, hai account và bằng chứng camera/micro thực; không đánh PASS từ mock UI.

<!-- table:tc -->
| TC | Trace | BR | API | Type | Verify | Scenario | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| TC-04.1-01 | REQ-MSG-07, REQ-MSG-08 | BR-08, BR-09 | API-08 | Integration | manual | Given call accepted và user chủ động vào call / When cấp camera/micro / Then một peer connection có local preview và trao đổi media với đúng peer | UNTESTED | - |
| TC-04.1-02 | REQ-MSG-07 | BR-08 | - | Negative | manual | Given user chỉ mở chat hoặc callee chưa accept / When trang render / Then browser chưa hỏi quyền và chưa bật camera/micro | UNTESTED | - |
| TC-04.1-03 | REQ-MSG-07 | BR-08 | - | Boundary | manual | Given camera bị từ chối nhưng micro dùng được / When user vào call / Then có lựa chọn audio-only hoặc hủy, không hiển thị video giả | UNTESTED | - |
| TC-04.1-04 | REQ-MSG-07 | BR-08 | - | Negative | manual | Given browser không hỗ trợ, insecure context hoặc không có cả hai thiết bị / When bắt đầu call / Then thông báo rõ, không crash và call không treo | UNTESTED | - |
| TC-04.1-05 | REQ-MSG-08 | BR-09 | API-08 | Boundary | cmd:node --test frontend/tests/call.test.mjs | Given ICE tới trước remote description hoặc event signaling lặp / When set remote description / Then candidate được áp dụng đúng một lần và không lỗi state | UNTESTED | - |
| TC-04.2-01 | REQ-MSG-09 | BR-10 | - | Positive | manual | Given hai browser có call connected / When bật/tắt micro và camera / Then track enabled, icon và remote media khớp từng lần đổi | UNTESTED | - |
| TC-04.2-02 | REQ-MSG-09, RISK-03 | BR-10 | API-06 | Integration | manual | Given call đang có local tracks / When một bên end / Then hai UI nhận terminal, peer.close chạy và local camera/micro tắt | UNTESTED | - |
| TC-04.2-03 | REQ-MSG-09, RISK-03 | BR-10 | API-06 | Negative | cmd:node --test frontend/tests/call.test.mjs | Given end event lặp, HTTP end lỗi hoặc component unmount / When cleanup gọi nhiều lần / Then không rò listener/timer/track và không dừng track ngoài ownership | UNTESTED | - |
| TC-04.2-04 | REQ-MSG-09 | BR-10 | - | Boundary | manual | Given camera track bị browser/OS thu hồi hoặc autoplay remote bị chặn / When UI cập nhật / Then hiển thị placeholder/hướng dẫn thay vì báo video đang chạy | UNTESTED | - |
| TC-04.3-01 | REQ-MSG-10 | BR-11 | API-05, API-08 | Positive | manual | Given media mất tạm dưới grace period / When kết nối phục hồi / Then UI từ reconnecting về connected mà không tạo call/peer thứ hai | UNTESTED | - |
| TC-04.3-02 | REQ-MSG-10 | BR-11 | API-05, API-08 | Negative | manual | Given ICE failed hoặc mất mạng quá grace / When reconcile với server / Then call kết thúc có lý do, UI dọn media và không quay vòng vô hạn | UNTESTED | - |
| TC-04.3-03 | REQ-MSG-08, RISK-06 | BR-09 | API-08 | Boundary | manual | Given hai client ở mạng không tìm được đường ICE khi chỉ có STUN / When hết thời gian kết nối / Then thấy failure rõ và không tuyên bố call connected | UNTESTED | - |
| TC-04.3-04 | REQ-MSG-10 | BR-11 | API-05 | Boundary | manual | Given browser reload khi call active / When trang mở lại / Then chỉ state canonical hiển thị và media cũ không bị giả là còn hoạt động | UNTESTED | - |
| TC-04.4-01 | REQ-MSG-12 | BR-13 | - | Positive | manual | Given desktop/tablet/mobile viewport mục tiêu / When mở incoming và active call / Then accept/decline/mute/camera/end nhìn thấy, bấm được và video/placeholder không che controls | UNTESTED | - |
| TC-04.4-02 | REQ-MSG-12 | BR-13 | - | Negative | manual | Given keyboard hoặc screen reader / When đi qua incoming và active call / Then mọi action có nhãn, focus rõ, trạng thái không chỉ bằng màu và không kẹt focus | UNTESTED | - |
| TC-04.4-03 | REQ-MSG-07, REQ-MSG-09 | BR-08, BR-10 | - | Integration | manual | Given Chrome desktop và mobile browser đã chọn / When từ chối quyền, gọi thành công rồi end / Then thông báo dịch đúng hai locale, media cleanup được kiểm trên thiết bị thật | UNTESTED | - |
