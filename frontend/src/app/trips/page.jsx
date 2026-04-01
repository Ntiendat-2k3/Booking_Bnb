"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { useDispatch, useSelector } from "react-redux";
import TripCard from "@/features/trips/TripCard";
import Container from "@/components/layout/Container";

function TripsContent() {
  const router = useRouter();
  const dispatch = useDispatch();
  const sp = useSearchParams();
  const user = useSelector((s) => s.auth.user);
  const isInitialized = useSelector((s) => s.auth.isInitialized);
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({ repayId: null, cancelId: null, checkoutId: null });

  const paymentStatus = sp.get("payment");
  const bookingId = sp.get("bookingId");
  const code = sp.get("code");

  // 1. Logic xử lý thông báo và kích hoạt Polling (Chống trôi trạng thái)
  useEffect(() => {
    const pStatus = sp.get("payment");
    const bid = sp.get("bookingId");
    const pCode = sp.get("code");
    
    if (!pStatus) return;

    let intervalId;

    if (pStatus === "success") {
      notifySuccess("Thanh toán thành công");
      
      let count = 0;
      intervalId = setInterval(async () => {
        count++;
        if (count > 5) {
          clearInterval(intervalId);
          return;
        }

        console.log(`[TripsPage] Polling payment status... lần thứ ${count}`);
        try {
          const res = await apiFetch("/api/v1/bookings/me", { method: "GET" });
          const newItems = res.data?.items || [];
          setItems(newItems);

          const target = newItems.find(b => String(b.id) === String(bid));
          if (target && target.status !== "pending_payment") {
            console.log("[TripsPage] Payment confirmed in background!");
            clearInterval(intervalId);
          }
        } catch (err) {
          console.error("[TripsPage] Polling error:", err);
        }
      }, 3000);
    } 
    else if (pStatus === "failed") {
      notifyInfo(`Thanh toán không thành công${pCode ? ` (code ${pCode})` : ""}`);
    } 
    else if (pStatus === "error") {
      notifyError("Không xác nhận được kết quả thanh toán");
    }

    // --- Clean URL (Luôn chạy nếu có pStatus) ---
    const u = new URL(window.location.href);
    const paramsToClean = ["payment", "bookingId", "paymentId", "code", "message"];
    let needsClean = false;
    paramsToClean.forEach(p => {
      if (u.searchParams.has(p)) {
        u.searchParams.delete(p);
        needsClean = true;
      }
    });

    if (needsClean) {
      window.history.replaceState({}, "", u.toString());
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]); 


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
    if (isInitialized) {
      if (!user) {
        router.push("/login");
      } else {
        load();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, user]);



  const pending = useMemo(() => items.filter((b) => b.status === "pending_payment"), [items]);

  async function repay(bookingId) {
    try {
      setBusy((s) => ({ ...s, repayId: bookingId }));
      const p = await apiFetch(`/api/v1/bookings/${bookingId}/payments/stripe`, {
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
      // Optimistic update
      setItems((prev) =>
        prev.map((b) => (String(b.id) === String(bookingId) ? { ...b, status: "completed", can_review: true } : b))
      );
      load();
    } catch (e) {
      notifyError(e?.message || "Không thể checkout");
    } finally {
      setBusy((s) => ({ ...s, checkoutId: null }));
    }
  }

  return (
    <Container className="py-12 w-full">
      <div className="mb-8 w-full">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Chuyến đi của bạn</h1>
        <p className="mt-2 text-lg text-slate-500">Danh sách các phòng bạn đã đặt và trạng thái hiện tại.</p>
      </div>

      <div className="w-full min-h-[600px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-20 bg-white border border-slate-100 rounded-3xl shadow-sm w-full">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 font-medium">Đang tải chuyến đi...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-16 bg-white border border-slate-100 rounded-3xl shadow-sm text-center w-full">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl">✈️</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Chưa có booking nào</h3>
            <p className="mt-2 text-slate-500 max-w-sm">
              Đã đến lúc phủi bụi chiếc vali và bắt đầu lên kế hoạch cho chuyến phiêu lưu tiếp theo rồi!
            </p>
            <Link href="/" className="mt-8 px-8 py-3 bg-brand text-white rounded-2xl font-bold hover:bg-brand-dark transition-all">
              Khám phá ngay
            </Link>
          </div>
        ) : (
          <div className="space-y-6 w-full flex-1">
            {items.map((b) => (
              <TripCard
                key={b.id}
                booking={b}
                busy={busy}
                onCheckout={checkout}
                onRepay={repay}
                onCancel={cancel}
              />
            ))}
          </div>
        )}
      </div>

      {pending.length > 0 && (
        <div className="mt-8 p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
          <div className="text-amber-500">💡</div>
          <p className="text-sm text-amber-800 leading-relaxed">
            Booking ở trạng thái <b>Chờ thanh toán</b> sẽ được giữ chỗ trong một thời gian ngắn. 
            Nếu chưa thanh toán, bạn có thể bấm <b>Thanh toán</b> để tiếp tục giao dịch.
          </p>
        </div>
      )}
    </Container>
  );
}

export default function TripsPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl px-4 py-12 mx-auto">Đang tải...</div>}>
      <TripsContent />
    </Suspense>
  );
}