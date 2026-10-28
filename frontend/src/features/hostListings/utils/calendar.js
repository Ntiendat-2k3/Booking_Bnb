import { addDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";

/** Mốc cuối luôn loại trừ; chế độ tháng và tuần giữ tuần bắt đầu vào thứ Hai. */
export function visibleRange(anchor, view) {
  if (view === "month") {
    return {
      start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
      end: addDays(endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }), 1),
    };
  }
  const start = view === "week" ? startOfWeek(anchor, { weekStartsOn: 1 }) : startOfMonth(anchor);
  return { start, end: view === "week" ? addDays(start, 7) : addDays(endOfMonth(anchor), 1) };
}

/** Lịch giữ cả ngày trả phòng khi chưa có giờ nhận/trả phòng cụ thể. */
export function dayEntries(date, calendar) {
  const bookings = calendar?.bookings?.filter((item) => item.check_in <= date && date <= item.check_out) || [];
  const blocks = calendar?.blocks?.filter((item) => item.start_date <= date && date < item.end_date) || [];
  const status = bookings.some((item) => item.status !== "pending_payment") ? "booked" :
    bookings.length ? "held" : blocks.length ? "blocked" : "available";
  return { bookings, blocks, status };
}

