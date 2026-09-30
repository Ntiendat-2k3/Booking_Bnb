"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Lightbulb, SuitcaseRolling } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api";
import { getMyBookings } from "@/services/bookingService";
import Button from "@/components/atoms/Button";
import { useRouter, useSearchParams } from "next/navigation";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { useSelector } from "react-redux";
import TripCard from "@/features/trips/TripCard";
import Container from "@/components/layout/Container";
import EmptyState from "@/components/molecules/EmptyState";
import { useTranslations } from "@/i18n/LocaleProvider";

function TripsContent() {
  const router = useRouter();
  const t = useTranslations();
  const sp = useSearchParams();
  const user = useSelector((s) => s.auth.user);
  const isInitialized = useSelector((s) => s.auth.isInitialized);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [payment] = useState(() => ({ status: sp.get("payment"), id: sp.get("bookingId"), code: sp.get("code") }));
  const [busy, setBusy] = useState({ repayId: null, cancelId: null, checkoutId: null });

  // Đồng bộ trạng thái giao dịch sau khi quay lại từ cổng thanh toán.
  useEffect(() => {
    if (!isInitialized) return;
    const { status: pStatus, id: bid, code: pCode } = payment;

    if (!pStatus) return;

    let intervalId;
    let active = true;
    let polling = false;

    if (pStatus === "success") {
      notifySuccess(t("trips.paymentSuccess"));

      let count = 0;
      intervalId = setInterval(async () => {
        if (polling) return;
        count++;
        if (count > 5) {
          clearInterval(intervalId);
          return;
        }

        polling = true;
        try {
          const res = await apiFetch("/api/v1/bookings/me", { method: "GET" });
          if (!active) return;
          const newItems = res.data?.items || [];
          setItems(newItems);

          const target = newItems.find(b => String(b.id) === String(bid));
          if (target && target.status !== "pending_payment") {
            clearInterval(intervalId);
          }
        } catch (err) {
          if (active) notifyError(t("trips.loadFailed"));
        } finally { polling = false; }
      }, 3000);
    }
    else if (pStatus === "failed") {
      notifyInfo(
        t("trips.paymentFailed", {
          code: pCode ? t("trips.paymentCode", { code: pCode }) : "",
        }),
      );
    }
    else if (pStatus === "error") {
      notifyError(t("trips.paymentUnknown"));
    }

    // Loại bỏ tham số callback để thao tác làm mới không hiển thị toast lần nữa.
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
      active = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [payment, t, isInitialized]);


  async function load() {
    try {
      setItems(await getMyBookings());
      setLoadError(false);
    } catch (e) {
      if (e?.status === 401) {
        notifyInfo(t("trips.loginRequired"));
        router.push("/login");
        return;
      }
      setLoadError(true);
      notifyError(e?.message || t("trips.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.push("/login");
      return;
    }

    let active = true;
    getMyBookings()
      .then((bookings) => {
        if (active) { setItems(bookings); setLoadError(false); }
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(true);
        notifyError(error?.message || t("trips.loadFailed"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isInitialized, router, t, user, attempt]);

  const pending = useMemo(() => items.filter((b) => b.status === "pending_payment"), [items]);

  async function repay(bookingId) {
    try {
      setBusy((s) => ({ ...s, repayId: bookingId }));
      const p = await apiFetch(`/api/v1/bookings/${bookingId}/payments/stripe`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const url = p.data?.payment_url;
      if (!url) throw new Error(t("trips.paymentUrlFailed"));
      window.location.href = url;
    } catch (e) {
      notifyError(e?.message || t("trips.repayFailed"));
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
      notifySuccess(t("trips.cancelled"));
      await load();
    } catch (e) {
      notifyError(e?.message || t("trips.cancelFailed"));
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
      notifySuccess(t("trips.checkoutSuccess"));
      // Cập nhật trước trên giao diện rồi đồng bộ lại với máy chủ.
      setItems((prev) =>
        prev.map((b) => (String(b.id) === String(bookingId) ? { ...b, status: "completed", can_review: true } : b))
      );
      load();
    } catch (e) {
      notifyError(e?.message || t("trips.checkoutFailed"));
    } finally {
      setBusy((s) => ({ ...s, checkoutId: null }));
    }
  }

  return (
    <Container className="w-full py-4 sm:py-6">
      <div className="mb-8 w-full">
        <h1 className="page-heading">
          {t("trips.title")}
        </h1>
        <p className="mt-2 text-base text-muted-ink">
          {t("trips.description")}
        </p>
      </div>

      <div className="w-full min-h-[600px] flex flex-col">
        {loading ? (
          <div className="surface-panel flex w-full flex-1 items-center justify-center p-10 sm:p-20">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
              <p className="font-medium text-muted-ink">{t("trips.loading")}</p>
            </div>
          </div>
        ) : loadError ? (<EmptyState title={t("trips.loadFailed")} action={<Button variant="secondary" onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>{t("common.retry")}</Button>} />) : items.length === 0 ? (
          <EmptyState
            className="flex-1 justify-center"
            icon={<SuitcaseRolling aria-hidden size={30} />}
            title={t("trips.emptyTitle")}
            description={t("trips.emptyDescription")}
            action={
              <Button
                href="/"
              >
                {t("trips.explore")}
              </Button>
            }
          />
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
        <div className="mt-8 flex gap-4 rounded-2xl border border-caution/20 bg-caution/10 p-5 text-caution">
          <Lightbulb aria-hidden size={22} className="shrink-0" />
          <p className="text-sm leading-6">
            {t("trips.pendingHint")}
          </p>
        </div>
      )}
    </Container>
  );
}

export default function TripsPage() {
  const t = useTranslations();

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-12 text-muted-ink">
          {t("common.loading")}
        </div>
      }
    >
      <TripsContent />
    </Suspense>
  );
}
