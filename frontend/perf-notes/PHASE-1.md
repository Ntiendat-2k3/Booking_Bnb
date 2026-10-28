# Phase 1 — Nhẹ

Đã bỏ import/registration Legend ở `RevenueChart`: chart luôn đặt `plugins.legend.display=false`, nên plugin không tham gia giao diện. Giữ nguyên data, scale, tooltip, màu, theme và đường biểu đồ.

Phosphor/date-fns đã được optimizePackageImports; các package lớn còn lại đều có caller thực tế, gồm dynamic import, nên giữ dependency. Không đổi compiler flags đã có. Mapbox/emoji/datepicker nằm ở chunk tải muộn; không thay thư viện để làm nhỏ biểu đồ analyzer.

GitNexus trả LOW cho RevenueChart, không nhận diện caller JSX; đã kiểm tra caller thực tế là trang host dashboard qua dynamic import. Cổng kiểm tra nằm trong `phase-1-checks.json`; build chuẩn vẫn dùng Turbopack. Mức giảm chunk chart sẽ được đo cùng bundle sau cùng; JS ban đầu không được tăng so với baseline.
