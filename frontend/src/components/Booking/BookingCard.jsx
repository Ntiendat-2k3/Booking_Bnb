"use client";

import { useMemo, useState } from "react";
import { createBooking } from "@/services/bookingService";
import { formatVND } from "@/lib/format";
import { notifyError, notifyInfo } from "@/lib/notify";
import Link from "next/link";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, differenceInDays } from "date-fns";

// Component nhận prop 'listing' từ component cha
export default function BookingSidebar({ listing }) {
  const router = useRouter();
  const user = useSelector((s) => s.auth.user);
  const isInitialized = useSelector((s) => s.auth.isInitialized);

  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;

  const [guests, setGuests] = useState(1);
  const [loading, setLoading] = useState(false);

  // Tính số đêm dựa trên ngày nhận và trả phòng
  const nights = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const n = differenceInDays(endDate, startDate);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [startDate, endDate]);

  // Tính tổng tiền
  const total = useMemo(() => {
    const p = Number(listing.price_per_night);
    if (!nights || !Number.isFinite(p)) return 0;
    return p * nights;
  }, [listing.price_per_night, nights]);

  // Hàm xử lý đặt phòng
  async function onReserve() {
    if (!isInitialized) return;
    if (!user) {
      notifyInfo("Bạn cần đăng nhập để đặt phòng");
      return;
    }
    if (!startDate || !endDate) {
      notifyError("Vui lòng chọn ngày nhận phòng và trả phòng");
      return;
    }

    if (!nights) {
      notifyError("Khoảng ngày không hợp lệ");
      return;
    }
    const g = Number(guests);
    if (!Number.isInteger(g) || g <= 0) {
      notifyError("Số khách không hợp lệ");
      return;
    }
    if (g > Number(listing.max_guests)) {
      notifyError(`Tối đa ${listing.max_guests} khách`);
      return;
    }

    setLoading(true);
    try {
      const booking = await createBooking({
        listing_id: listing.id,
        check_in: format(startDate, "yyyy-MM-dd"),
        check_out: format(endDate, "yyyy-MM-dd"),
        guests_count: g,
      });

      const bookingId = booking?.id;
      if (!bookingId) throw new Error("Create booking failed");

      router.push(`/checkout/${bookingId}`);
    } catch (e) {
      notifyError(e?.message || "Đặt phòng thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="h-fit lg:sticky lg:top-28 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-end justify-between">
        <div className="text-xl font-semibold">
          {formatVND(listing.price_per_night)}{" "}
          <span className="text-sm font-normal text-slate-600">/ đêm</span>
        </div>
      </div>
      {/* KHU VỰC CHỌN NGÀY VÀ KHÁCH */}
      <div className="mt-4 rounded-2xl border">
        <div className="grid grid-cols-1">
          {/* Section: Thời gian */}
          <div className="border-b p-3">
            <div className="text-[10px] font-semibold uppercase text-slate-700 mb-1">
              Thời gian
            </div>
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              minDate={new Date()}
              placeholderText="Chọn ngày nhận và trả phòng"
              className="w-full rounded-lg border px-3 py-2 text-sm z-50 focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              calendarClassName="shadow-lg border-slate-200 rounded-2xl"
              monthsShown={2}
            />
          </div>

          {/* Section: Số lượng khách */}
          <div className="p-3">
            <div className="text-[10px] font-semibold uppercase text-slate-700">
              Khách
            </div>
            <input
              type="number"
              min={1}
              max={listing.max_guests}
              className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
            />
            <div className="mt-1 text-xs text-slate-500">
              Tối đa {listing.max_guests} khách
            </div>
          </div>
        </div>{" "}
        {/* ĐÓNG THẺ GRID */}
      </div>{" "}
      {/* ĐÓNG THẺ BORDER BAO NGOÀI */}
      {/* HIỂN THỊ CHI PHÍ TẠM TÍNH */}
      {nights > 0 && (
        <div className="mt-4 rounded-2xl border p-3 text-sm">
          <div className="flex items-center justify-between">
            <span>
              {formatVND(listing.price_per_night)} x {nights} đêm
            </span>
            <span className="font-medium">{formatVND(total)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t pt-2">
            <span className="font-semibold">Tổng</span>
            <span className="font-semibold">{formatVND(total)}</span>
          </div>
        </div>
      )}
      {/* NÚT ĐẶT PHÒNG */}
      <button
        className="mt-4 w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        onClick={onReserve}
        disabled={loading}
      >
        {loading ? "Đang xử lý..." : "Đặt phòng"}
      </button>
      {/* THÔNG BÁO ĐĂNG NHẬP */}
      {isInitialized && !user && (
        <p className="mt-3 text-xs text-slate-600">
          Bạn chưa đăng nhập.{" "}
          <Link className="underline" href="/login">
            Đăng nhập
          </Link>{" "}
          để đặt phòng.
        </p>
      )}
    </aside>
  );
}
