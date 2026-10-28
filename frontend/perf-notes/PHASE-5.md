# Phase 5 — Hoãn

Không sửa script ứng dụng. Kiểm kê `inventory.json` và import thực tế không có analytics/chat/pixel script ngoài ở root cần chuyển sang `next/script`. Script ở trang phòng là `application/ld+json`, giữ nguyên để bảo toàn metadata. Widget AI và socket đã được nạp theo nhu cầu từ checkpoint, không đưa thêm script vào layout.

Stripe Elements chỉ được import bởi phần checkout, không phải root layout; giữ nguyên theo điều kiện dừng liên quan thanh toán. Google OAuth là luồng điều hướng/xác thực hiện có; không sửa cách nạp hoặc chuyển hướng. Không tạo script giả, không xóa dependency đang có caller.

Cổng kiểm tra lint/test/test:performance/build lưu ở `phase-5-checks.json`, phải xanh trước Phase 6.
