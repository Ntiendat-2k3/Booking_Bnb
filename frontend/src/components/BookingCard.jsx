"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatVND } from "@/lib/format";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import Link from "next/link";
import { useSelector } from "react-redux";

function daysBetween(a, b) {
  const d1 = new Date(a + "T00:00:00Z");
  const d2 = new Date(b + "T00:00:00Z");
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

export default function BookingCard({ listing }) {
  const user = useSelector((s) => s.auth.user);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [loading, setLoading] = useState(false);

  const todayStr = useMemo(() => {
    // yyyy-mm-dd in local time
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const minCheckOut = useMemo(() => {
    if (!checkIn) return todayStr;
    // Require checkout strictly after check-in
    const d = new Date(checkIn + "T00:00:00");
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, [checkIn, todayStr]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const n = daysBetween(checkIn, checkOut);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [checkIn, checkOut]);

  const total = useMemo(() => {
    const p = Number(listing.price_per_night);
    if (!nights || !Number.isFinite(p)) return 0;
    return p * nights;
  }, [listing.price_per_night, nights]);

  async function onReserve() {
    if (!user) {
      notifyInfo("Bạn cần đăng nhập để đặt phòng");
      return;
    }
    if (!checkIn || !checkOut) {
      notifyError("Vui lòng chọn ngày nhận phòng và trả phòng");
      return;
    }

    // Disallow past dates (client-side guard; server also validates)
    if (checkIn < todayStr) {
      notifyError("Ngày nhận phòng không được ở trong quá khứ");
      return;
    }
    if (checkOut <= checkIn) {
      notifyError("Ngày trả phòng phải sau ngày nhận phòng");
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
      const b = await apiFetch("/api/v1/bookings", {
        method: "POST",
        body: JSON.stringify({
          listing_id: listing.id,
          check_in: checkIn,
          check_out: checkOut,
          guests_count: g,
        }),
      });

      const bookingId = b.data?.booking?.id;
      if (!bookingId) throw new Error("Create booking failed");

      const p = await apiFetch(`/api/v1/bookings/${bookingId}/payments/vnpay`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      const url = p.data?.payment_url;
      if (!url) throw new Error("Không tạo được URL thanh toán");

      notifySuccess("Đang chuyển tới VNPay...");
      window.location.href = url;
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

      <div className="mt-4 rounded-2xl border">
        <div className="grid grid-cols-2">
          <div className="border-b border-r p-3">
            <div className="text-[10px] font-semibold uppercase text-slate-700">Nhận phòng</div>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
              value={checkIn}
              min={todayStr}
              onChange={(e) => {
                const v = e.target.value;
                setCheckIn(v);
                // If checkout is now invalid, clear it so user re-picks.
                if (checkOut && v && checkOut <= v) setCheckOut("");
              }}
            />
          </div>
          <div className="border-b p-3">
            <div className="text-[10px] font-semibold uppercase text-slate-700">Trả phòng</div>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
              value={checkOut}
              min={minCheckOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>
        </div>
        <div className="p-3">
          <div className="text-[10px] font-semibold uppercase text-slate-700">Khách</div>
          <input
            type="number"
            min={1}
            max={listing.max_guests}
            className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
          />
          <div className="mt-1 text-xs text-slate-500">Tối đa {listing.max_guests} khách</div>
        </div>
      </div>

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

      <button
        className="mt-4 w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        onClick={onReserve}
        disabled={loading}
      >
        {loading ? "Đang xử lý..." : "Đặt phòng"}
      </button>

      {!user && (
        <p className="mt-3 text-xs text-slate-600">
          Bạn chưa đăng nhập. <Link className="underline" href="/login">Đăng nhập</Link> để đặt phòng.
        </p>
      )}
    </aside>
  );
}
