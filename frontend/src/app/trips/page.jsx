"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CalendarCheck, CheckCircle, Clock, House, Lightbulb, SuitcaseRolling, XCircle } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api";
import { getMyBookings } from "@/services/bookingService";
import Button from "@/components/atoms/Button";
import { useRouter, useSearchParams } from "next/navigation";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { useSelector } from "react-redux";
import TripCard from "@/features/trips/TripCard";
import CancellationDialog from "@/features/trips/CancellationDialog";
import { useChatSocket } from "@/features/chat/hooks/useChatSocket";
import Container from "@/components/layout/Container";
import EmptyState from "@/components/molecules/EmptyState";
import { useTranslations } from "@/i18n/LocaleProvider";

const tripFilters = [
  { id: "all", label: "trips.filterAll", Icon: House },
  { id: "confirmed", label: "trips.statusConfirmed", Icon: CalendarCheck },
  { id: "cancelled", label: "trips.statusCancelled", Icon: XCircle },
  { id: "upcoming", label: "trips.filterUpcoming", Icon: Clock },
  { id: "completed", label: "trips.statusCompleted", Icon: CheckCircle },
];

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
  const [activeFilter, setActiveFilter] = useState("all");
  const [cancellationBookingId, setCancellationBookingId] = useState(null);

  useChatSocket(user?.id, (event, connected) => {
    if (event === "booking:status" || (event === "connection" && connected))
      setAttempt((value) => value + 1);
  });

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
      notifyError(t("trips.loadFailed"));
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
      .catch(() => {
        if (!active) return;
        setLoadError(true);
        notifyError(t("trips.loadFailed"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isInitialized, router, t, user, attempt]);

  const pending = useMemo(() => items.filter((b) => b.status === "pending_payment"), [items]);
  const today = new Date().toISOString().slice(0, 10);
  const filterCounts = useMemo(() => ({
    all: items.length,
    confirmed: items.filter((booking) => booking.status === "confirmed").length,
    cancelled: items.filter((booking) => booking.status === "cancelled").length,
    upcoming: items.filter((booking) => booking.status === "confirmed" && booking.check_in > today).length,
    completed: items.filter((booking) => booking.status === "completed").length,
  }), [items, today]);
  const visibleItems = useMemo(() => items.filter((booking) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "upcoming") return booking.status === "confirmed" && booking.check_in > today;
    return booking.status === activeFilter;
  }), [activeFilter, items, today]);

  async function repay(bookingId) {
    router.push(`/checkout/${bookingId}`);
  }

  async function cancel(bookingId) {
    setCancellationBookingId(bookingId);
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
      notifyError(t(e?.message === "Stay has not ended yet" ? "trips.checkoutTooEarly" : "trips.checkoutFailed"));
    } finally {
      setBusy((s) => ({ ...s, checkoutId: null }));
    }
  }

  return (
    <div className="trips-page">
      {cancellationBookingId && <CancellationDialog bookingId={cancellationBookingId}
        onClose={() => setCancellationBookingId(null)}
        onCancelled={() => { setCancellationBookingId(null); notifySuccess(t("trips.cancelled")); void load(); }} />}
      <section className="relative isolate overflow-hidden bg-[#14251b] text-white">
        <Image src="/nature-hero.webp" alt="" fill priority sizes="100vw" className="-z-10 object-cover object-[center_58%]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#07160e]/90 via-[#0b1d14]/65 to-[#0a1b12]/35" />
        <Container className="flex min-h-36 items-center justify-between gap-8 py-6 sm:min-h-64 sm:py-12">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.05em] sm:text-5xl">{t("trips.title")}</h1>
            <p className="mt-1.5 max-w-xl text-sm text-white/85 sm:mt-3 sm:text-base">{t("trips.description")}</p>
          </div>
          <p aria-hidden="true" className="hidden max-w-60 -rotate-6 text-center font-serif text-2xl italic leading-snug text-white/90 lg:block">{t("trips.heroAside")}</p>
        </Container>
      </section>

      <Container className="relative -mt-3 pb-8 sm:-mt-4 sm:pb-12">
      <nav aria-label={t("trips.filterLabel")} className="mb-3 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-surface/95 p-1 shadow-soft sm:mb-5 sm:rounded-full sm:p-1.5">
        {tripFilters.map(({ id, label, Icon }) => <button
          key={id}
          type="button"
          aria-pressed={activeFilter === id}
          onClick={() => setActiveFilter(id)}
          className={`flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:min-h-12 sm:flex-1 sm:gap-2 sm:rounded-full sm:px-4 sm:text-sm ${activeFilter === id ? "bg-brand text-on-brand" : "text-muted-ink hover:bg-muted-surface hover:text-ink"}`}
        >
          <Icon aria-hidden size={19} weight={activeFilter === id ? "fill" : "regular"} className="hidden sm:block" />
          <span>{t(label)}</span>
          <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${activeFilter === id ? "bg-on-brand/15" : "bg-muted-surface"}`}>{filterCounts[id]}</span>
        </button>)}
      </nav>

      <div className="flex min-h-[240px] w-full flex-col sm:min-h-[400px]">
        {loading ? (
          <div className="surface-panel flex w-full flex-1 items-center justify-center p-6 sm:p-20">
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
        ) : visibleItems.length === 0 ? (
          <EmptyState className="flex-1 justify-center" icon={<SuitcaseRolling aria-hidden size={30} />} title={t("trips.filterEmpty")} action={<Button variant="secondary" onClick={() => setActiveFilter("all")}>{t("trips.filterAll")}</Button>} />
        ) : (
          <div className="w-full flex-1 space-y-3 sm:space-y-4">
            {visibleItems.map((b) => (
              <TripCard
                key={b.id}
                booking={b}
                booker={user}
                busy={busy}
                onCheckout={checkout}
                onRepay={repay}
                onCancel={cancel}
              />
            ))}
          </div>
        )}
      </div>

      {activeFilter === "all" && pending.length > 0 && (
        <div className="mt-5 flex gap-3 rounded-2xl border border-caution/20 bg-caution/10 p-3 text-caution sm:mt-7 sm:gap-4 sm:p-5">
          <Lightbulb aria-hidden size={22} className="shrink-0" />
          <p className="text-sm leading-6">
            {t("trips.pendingHint")}
          </p>
        </div>
      )}
      </Container>
    </div>
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
