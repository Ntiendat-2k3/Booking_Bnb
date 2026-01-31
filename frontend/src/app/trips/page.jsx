"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
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

function statusLabel(status) {
  switch (status) {
    case "pending_payment":
      return "Chờ thanh toán";
    case "confirmed":
      return "Đã xác nhận";
    case "completed":
      return "Đã checkout";
    case "cancelled":
      return "Đã hủy";
    default:
      return status;
  }
}

export default function TripsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({ repayId: null, cancelId: null, checkoutId: null });

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
      setBusy((s) => ({ ...s, repayId: bookingId }));
      const p = await apiFetch(`/api/v1/bookings/${bookingId}/payments/vnpay`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const url = p.data?.payment_url;
      if (!url) throw new Error("Không tạo được URL thanh toán");
      window.location.href = url;
    } catch (e) {
      notifyError(e?.message || "Không thể thanh toán lại");
    } finally {
      setBusy((s) => ({ ...s, repayId: null }));
    }
  }

  async function cancel(bookingId) {
    try {
      setBusy((s) => ({ ...s, cancelId: bookingId }));
      await apiFetch(`/api/v1/bookings/${bookingId}/cancel`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      notifySuccess("Đã hủy booking");
      await load();
    } catch (e) {
      notifyError(e?.message || "Không thể hủy booking");
    } finally {
      setBusy((s) => ({ ...s, cancelId: null }));
    }
  }

  async function checkout(bookingId) {
    try {
      setBusy((s) => ({ ...s, checkoutId: bookingId }));
      await apiFetch(`/api/v1/bookings/${bookingId}/checkout`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      notifySuccess("Checkout thành công. Bạn có thể đánh giá ngay!");
      // Optimistic: hide Checkout immediately and show Review.
      setItems((prev) =>
        prev.map((b) => (String(b.id) === String(bookingId) ? { ...b, status: "completed", can_review: true } : b))
      );
      // Refresh in background for consistency.
      load();
    } catch (e) {
      notifyError(e?.message || "Không thể checkout");
    } finally {
      setBusy((s) => ({ ...s, checkoutId: null }));
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
          <Link href="/search" className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Tìm phòng
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((b) => {
            const listing = b.listing;
            const cover = listing?.cover_url;
            const lastPayment = (b.payments || [])[0];
            const isPaid = lastPayment?.status === "succeeded";
            return (
              <div key={b.id} className="rounded-2xl border bg-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-28 w-full sm:w-44">
                    <Image
                      src={cover || "https://picsum.photos/seed/trip/600/400"}
                      alt={listing?.title || "Trip"}
                      fill
                      sizes="(max-width: 640px) 100vw, 176px"
                      className="rounded-xl object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-lg font-semibold">{listing?.title || "Phòng"}</div>
                      <span className={badge(b.status)}>{statusLabel(b.status)}</span>
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

                  {b.review && (
                    <div className="mt-2 text-xs text-slate-600">
                      Bạn đã đánh giá: <span className="font-semibold">{b.review.rating}★</span>
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

                    {!b.can_review && b.review && (
                      <Link
                        href={`/rooms/${listing?.id}#reviews`}
                        className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                      >
                        Xem đánh giá
                      </Link>
                    )}

                    {b.can_review && (
                      <Link
                        href={`/rooms/${listing?.id}?review=1#reviews`}
                        className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                      >
                        Đánh giá
                      </Link>
                    )}

                    {b.status === "confirmed" && isPaid && (
                      <button
                        onClick={() => checkout(b.id)}
                        disabled={busy.checkoutId === b.id}
                        className={`rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {busy.checkoutId === b.id ? "Đang checkout..." : "Checkout"}
                      </button>
                    )}

                    {b.status === "pending_payment" && (
                      <>
                        <button
                          onClick={() => repay(b.id)}
                          disabled={busy.repayId === b.id}
                          className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy.repayId === b.id ? "Đang tạo..." : "Thanh toán"}
                        </button>
                        <button
                          onClick={() => cancel(b.id)}
                          disabled={busy.cancelId === b.id}
                          className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy.cancelId === b.id ? "Đang hủy..." : "Hủy"}
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