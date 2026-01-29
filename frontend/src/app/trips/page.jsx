"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { formatVND } from "@/lib/format";

function badge(status) {
  const base = "rounded-full px-2 py-0.5 text-xs font-semibold";
  switch (status) {
    case "confirmed":
      return `${base} bg-emerald-50 text-emerald-700`;
    case "pending_payment":
      return `${base} bg-amber-50 text-amber-700`;
    case "cancelled":
      return `${base} bg-slate-100 text-slate-700`;
    case "completed":
      return `${base} bg-sky-50 text-sky-700`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
}

export default function TripsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const paymentStatus = sp.get("payment");
  const bookingId = sp.get("bookingId");
  const code = sp.get("code");

  useEffect(() => {
    if (!paymentStatus) return;
    if (paymentStatus === "success") notifySuccess("Thanh toán thành công");
    else if (paymentStatus === "failed") notifyInfo(`Thanh toán không thành công${code ? ` (code ${code})` : ""}`);
    else if (paymentStatus === "error") notifyError("Không xác nhận được kết quả thanh toán");

    // Clean URL
    const u = new URL(window.location.href);
    u.searchParams.delete("payment");
    u.searchParams.delete("bookingId");
    u.searchParams.delete("paymentId");
    u.searchParams.delete("code");
    u.searchParams.delete("message");
    window.history.replaceState({}, "", u.toString());
  }, [paymentStatus, code]);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/v1/bookings/me", { method: "GET" });
      setItems(res.data?.items || []);
    } catch (e) {
      if (e?.status === 401) {
        notifyInfo("Bạn cần đăng nhập để xem chuyến đi");
        router.push("/login");
        return;
      }
      notifyError(e?.message || "Không tải được trips");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = useMemo(() => items.filter((b) => b.status === "pending_payment"), [items]);

  async function repay(bookingId) {
    try {
      const p = await apiFetch(`/api/v1/bookings/${bookingId}/payments/vnpay`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const url = p.data?.payment_url;
      if (!url) throw new Error("Không tạo được URL thanh toán");
      window.location.href = url;
    } catch (e) {
      notifyError(e?.message || "Không thể thanh toán lại");
    }
  }

  async function cancel(bookingId) {
    try {
      await apiFetch(`/api/v1/bookings/${bookingId}/cancel`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      notifySuccess("Đã hủy booking");
      await load();
    } catch (e) {
      notifyError(e?.message || "Không thể hủy booking");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Chuyến đi của bạn</h1>
      <p className="mt-1 text-slate-600">Danh sách phòng đã đặt và trạng thái thanh toán.</p>

      {loading ? (
        <div className="mt-6 text-slate-600">Đang tải...</div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border bg-white p-6">
          <div className="font-semibold">Chưa có booking nào</div>
          <p className="mt-1 text-slate-600">Hãy tìm một chỗ ở và đặt phòng.</p>
          <Link href="/search" className="mt-4 inline-flex rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600">
            Tìm phòng
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((b) => {
            const listing = b.listing;
            const cover = listing?.cover_url;
            const lastPayment = (b.payments || [])[0];
            return (
              <div key={b.id} className="rounded-2xl border bg-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cover || "https://picsum.photos/seed/trip/600/400"}
                    alt=""
                    className="h-28 w-full rounded-xl object-cover sm:w-44"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-lg font-semibold">{listing?.title || "Phòng"}</div>
                      <span className={badge(b.status)}>{b.status}</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {b.check_in} → {b.check_out} • {b.guests_count} khách
                    </div>
                    <div className="mt-1 text-sm text-slate-700">
                      Tổng: <span className="font-semibold">{formatVND(b.total_amount)}</span>
                    </div>
                    {lastPayment && (
                      <div className="mt-1 text-xs text-slate-500">
                        Payment: {lastPayment.provider} • {lastPayment.status}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/rooms/${listing?.id}`}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      Xem phòng
                    </Link>

                    {b.status === "pending_payment" && (
                      <>
                        <button
                          onClick={() => repay(b.id)}
                          className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-600"
                        >
                          Thanh toán
                        </button>
                        <button
                          onClick={() => cancel(b.id)}
                          className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                        >
                          Hủy
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pending.length > 0 && (
        <p className="mt-4 text-xs text-slate-500">
          * Booking ở trạng thái <b>pending_payment</b> sẽ được giữ chỗ trong một thời gian ngắn. Nếu chưa thanh toán, bạn có thể bấm <b>Thanh toán</b> để tạo giao dịch mới.
        </p>
      )}
    </div>
  );
}
