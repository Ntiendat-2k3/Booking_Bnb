"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { addDays, format, parseISO } from "date-fns";
import { ArrowLeft, CalendarBlank, CheckCircle, CircleNotch, CreditCard, LockKey, MapPin, Moon, PencilSimple, ShieldCheck, Users, XCircle } from "@phosphor-icons/react";
import Container from "@/components/layout/Container";
import Button from "@/components/atoms/Button";
import IconButton from "@/components/atoms/IconButton";
import InputField from "@/components/atoms/InputField";
import DateField from "@/components/molecules/DateField";
import { apiFetch } from "@/lib/api";
import { formatVND } from "@/lib/format";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { useLocale } from "@/i18n/LocaleProvider";
import { applyBookingCoupon, confirmPropertyPayment, createStripePayment, reconcileStripePayment,
  removeBookingCoupon, updateBooking } from "@/services/bookingService";
import PriceBreakdown from "@/components/Booking/PriceBreakdown";
import CancellationDialog from "@/features/trips/CancellationDialog";

const StripePaymentForm = dynamic(() => import("@/features/checkout/StripePaymentForm"), { ssr: false });
const stripeConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function stayDate(value) {
  return value ? format(parseISO(value), "dd/MM/yyyy") : "";
}

/** Chỉ trạng thái booking từ máy chủ mới xác nhận đơn; kết quả Stripe ở trình duyệt chỉ khởi động bước chờ webhook. */
export default function CheckoutPage() {
  const { locale, t } = useLocale();
  const { id } = useParams();
  const router = useRouter();
  const user = useSelector((state) => state.auth.user);
  const isInitialized = useSelector((state) => state.auth.isInitialized);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [intent, setIntent] = useState(null);
  const [paymentChoice, setPaymentChoice] = useState(null);
  const [propertyBusy, setPropertyBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [phase, setPhase] = useState("form");
  const [editingDates, setEditingDates] = useState(false);
  const [editingGuests, setEditingGuests] = useState(false);
  const [draftCheckIn, setDraftCheckIn] = useState("");
  const [draftCheckOut, setDraftCheckOut] = useState("");
  const [draftGuests, setDraftGuests] = useState(1);
  const [saving, setSaving] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [cancellationOpen, setCancellationOpen] = useState(false);
  const requestRef = useRef(0);

  const preparePayment = useCallback(async () => {
    const request = ++requestRef.current;
    setIntent(null);
    setPaymentError("");
    if (!stripeConfigured) {
      setPaymentError(t("checkout.stripeNotConfigured"));
      return;
    }
    setPreparing(true);
    try {
      const result = await createStripePayment(id);
      if (request !== requestRef.current) return;
      if (["succeeded", "processing"].includes(result?.status)) {
        setPhase("processing");
      } else if (result?.client_secret) {
        setIntent(result);
      } else {
        setPaymentError(t("checkout.paymentFailed"));
      }
    } catch (error) {
      if (request !== requestRef.current) return;
      if (error?.status === 409) {
        setPhase("expired");
      } else {
        setPaymentError(error?.status === 503 ? t("checkout.paymentUnavailable") : error?.message || t("checkout.paymentFailed"));
      }
    } finally {
      if (request === requestRef.current) setPreparing(false);
    }
  }, [id, t]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      notifyInfo(t("checkout.loginRequired"));
      router.push("/login");
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const response = await apiFetch("/api/v1/bookings/" + id);
        if (!active) return;
        const current = response.data.booking;
        setBooking(current);
        setLoading(false);
        if (current.status === "pending_payment") {
          setPhase("form");
          setPaymentChoice(null);
          setIntent(null);
          setPaymentError("");
        } else setPhase(["confirmed", "completed"].includes(current.status) ? "success" : "expired");
      } catch {
        if (active) { notifyError(t("checkout.bookingNotFound")); router.push("/trips"); }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const pendingRequest = requestRef;
    return () => { active = false; pendingRequest.current++; };
  }, [id, isInitialized, preparePayment, router, t, user]);

  useEffect(() => {
    if (phase !== "processing") return;
    let active = true;
    let timer;
    let checks = 0;
    const check = async () => {
      try {
        const result = await reconcileStripePayment(id);
        if (!active) return;
        if (["confirmed", "completed"].includes(result.booking_status)) { setPhase("success"); return; }
        if (result.booking_status !== "pending_payment") { setPhase("expired"); return; }
        if (result.payment_status === "requires_payment_method") {
          setPhase("form");
          void preparePayment();
          return;
        }
      } catch { /* Lần kế tiếp tiếp tục kiểm tra trạng thái. */ }
      if (!active) return;
      checks++;
      if (checks >= 15) { setPhase("awaiting"); return; }
      timer = setTimeout(check, 2000);
    };
    void check();
    return () => { active = false; clearTimeout(timer); };
  }, [id, phase, preparePayment]);

  const refreshStatus = async () => {
    try {
      const result = await reconcileStripePayment(id);
      if (["confirmed", "completed"].includes(result.booking_status)) setPhase("success");
      else if (result.booking_status !== "pending_payment") setPhase("expired");
      else setPhase("processing");
    } catch { notifyError(t("checkout.statusFailed")); }
  };

  const confirmProperty = async () => {
    if (propertyBusy) return;
    setPropertyBusy(true);
    setPaymentError("");
    try {
      const confirmed = await confirmPropertyPayment(id);
      setBooking((current) => ({ ...current, ...confirmed, listing: current.listing }));
      setPhase("success");
    } catch (error) {
      setPaymentError(error?.message || t("checkout.propertyFailed"));
    } finally { setPropertyBusy(false); }
  };

  const saveDates = async () => {
    if (saving || !draftCheckIn || !draftCheckOut || draftCheckIn < format(new Date(), "yyyy-MM-dd") || draftCheckOut <= draftCheckIn) {
      notifyInfo(t("booking.invalidDates")); return;
    }
    if (draftCheckIn === booking.check_in && draftCheckOut === booking.check_out) { setEditingDates(false); return; }
    setSaving(true);
    try {
      const hadCoupon = Boolean(booking.price_breakdown_snapshot?.coupon);
      const updated = await updateBooking(id, { check_in: draftCheckIn, check_out: draftCheckOut });
      setBooking(updated); setEditingDates(false); setIntent(null);
      notifySuccess(t("checkout.datesUpdated"));
      if (hadCoupon && !updated.price_breakdown_snapshot?.coupon)
        notifyInfo(t("coupons.removedAfterDates"));
      if (paymentChoice === "stripe") await preparePayment();
    } catch (error) { notifyError(error?.message || t("checkout.datesUpdateFailed")); }
    finally { setSaving(false); }
  };

  const saveGuests = async () => {
    if (saving || !Number.isInteger(Number(draftGuests)) || Number(draftGuests) < 1 || Number(draftGuests) > (booking.listing?.max_guests || 16)) return;
    if (Number(draftGuests) === booking.guests_count) { setEditingGuests(false); return; }
    setSaving(true);
    try {
      const updated = await updateBooking(id, { guests_count: Number(draftGuests) });
      setBooking(updated); setEditingGuests(false); setIntent(null);
      notifySuccess(t("checkout.guestsUpdated"));
      if (paymentChoice === "stripe") await preparePayment();
    } catch (error) { notifyError(error?.message || t("checkout.guestsUpdateFailed")); }
    finally { setSaving(false); }
  };

  async function changeCoupon(remove = false) {
    if (couponBusy || phase !== "form") return;
    setCouponBusy(true);
    setCouponError("");
    try {
      const updated = remove ? await removeBookingCoupon(id) :
        await applyBookingCoupon(id, couponCode.trim());
      setBooking(updated);
      setCouponCode("");
      setIntent(null);
      if (paymentChoice === "stripe") await preparePayment();
    } catch (error) {
      const key = `coupons.errors.${error?.message}`;
      setCouponError(error?.message?.startsWith("COUPON_") ? t(key) :
        error?.status === 400 ? t("coupons.errors.COUPON_INVALID") :
          error?.message || t("coupons.applyFailed"));
    } finally { setCouponBusy(false); }
  }

  if (loading || !isInitialized) return <Container className="flex min-h-[60vh] items-center justify-center"><CircleNotch aria-label={t("common.loading")} size={32} className="animate-spin text-brand" /></Container>;
  if (!booking) return null;

  const { listing } = booking;
  const cover = listing?.images?.find((image) => image.is_cover)?.url || listing?.images?.[0]?.url || listing?.cover_url;
  const nights = Math.max(1, (Date.parse(booking.check_out + "T00:00:00Z") - Date.parse(booking.check_in + "T00:00:00Z")) / 86400000);
  const money = (value) => formatVND(value, locale === "en" ? "en-US" : "vi-VN");
  const cardDisabled = saving || couponBusy || editingDates || editingGuests;
  const today = format(new Date(), "yyyy-MM-dd");

  return <Container className="pb-12 pt-6 sm:pt-9">
    {cancellationOpen && <CancellationDialog bookingId={id}
      onClose={() => setCancellationOpen(false)}
      onCancelled={() => { setCancellationOpen(false); router.replace("/trips"); }} />}
    <header className="mb-7 flex items-start gap-3">
      <IconButton onClick={() => router.back()} label={t("common.back")} className="mt-0.5 shrink-0"><ArrowLeft aria-hidden size={20} /></IconButton>
      <div><h1 className="page-heading">{t("checkout.title")}</h1><p className="mt-1 text-sm text-muted-ink">{t("checkout.subtitle")}</p></div>
    </header>

    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
      <div className="surface-panel space-y-7 p-5 sm:p-7 lg:p-8">
        <section className="border-b border-line pb-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-3 text-xl font-semibold text-ink"><CalendarBlank aria-hidden size={23} className="text-brand" />{t("checkout.trip")}</h2>
            {phase === "form" && !editingDates && !editingGuests && <Button size="sm" variant="ghost" onClick={() => { setDraftCheckIn(booking.check_in); setDraftCheckOut(booking.check_out); setEditingDates(true); }}><PencilSimple aria-hidden size={16} />{t("common.edit")}</Button>}
          </div>
          {editingDates ? <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DateField label={t("checkout.checkIn")} selected={draftCheckIn ? parseISO(draftCheckIn) : null}
                minDate={parseISO(today)} maxDate={draftCheckOut ? parseISO(draftCheckOut) : undefined}
                onChange={(date) => setDraftCheckIn(date ? format(date, "yyyy-MM-dd") : "")} />
              <DateField label={t("checkout.checkOut")} selected={draftCheckOut ? parseISO(draftCheckOut) : null}
                minDate={draftCheckIn ? addDays(parseISO(draftCheckIn), 1) : parseISO(today)}
                onChange={(date) => setDraftCheckOut(date ? format(date, "yyyy-MM-dd") : "")} />
            </div>
            <div className="flex gap-2"><Button size="sm" onClick={saveDates} disabled={saving}>{t("common.save")}</Button><Button size="sm" variant="ghost" onClick={() => setEditingDates(false)} disabled={saving}>{t("common.cancel")}</Button></div>
          </div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto_auto]">
            <div><span className="block text-xs text-muted-ink">{t("checkout.checkIn")}</span><strong className="mt-1 block font-semibold text-ink">{stayDate(booking.check_in)}</strong></div>
            <div><span className="block text-xs text-muted-ink">{t("checkout.checkOut")}</span><strong className="mt-1 block font-semibold text-ink">{stayDate(booking.check_out)}</strong></div>
            <div className="flex items-center gap-2 text-sm text-ink"><Moon aria-hidden size={18} className="text-brand" />{t("checkout.nights", { count: nights })}</div>
            <div className="flex items-center gap-2 text-sm text-ink"><Users aria-hidden size={18} className="text-brand" />{t("checkout.guestCount", { count: booking.guests_count })}</div>
          </div>}
          {phase === "form" && !editingDates && <div className="mt-4">
            {editingGuests ? <div className="flex flex-wrap items-end gap-3"><InputField label={t("checkout.guests")} type="number" min={1} max={listing?.max_guests || 16} value={draftGuests} onChange={(event) => setDraftGuests(event.target.value)} /><Button size="sm" onClick={saveGuests} disabled={saving}>{t("common.save")}</Button><Button size="sm" variant="ghost" onClick={() => setEditingGuests(false)} disabled={saving}>{t("common.cancel")}</Button></div>
              : <button type="button" onClick={() => { setDraftGuests(booking.guests_count); setEditingGuests(true); }} className="text-sm font-semibold text-brand underline underline-offset-4">{t("checkout.editGuests")}</button>}
          </div>}
        </section>

        <section className="space-y-5">
          <h2 className="flex items-center gap-3 text-xl font-semibold text-ink"><CreditCard aria-hidden size={23} className="text-brand" />{t("checkout.paymentMethod")}</h2>
          {phase === "form" && <div className="grid gap-3 sm:grid-cols-2">
            <Button variant={paymentChoice === "stripe" ? "primary" : "secondary"} onClick={() => {
              setPaymentChoice("stripe"); if (!intent) void preparePayment();
            }}>{t("checkout.stripeCard")}</Button>
            <Button variant={paymentChoice === "property" ? "primary" : "secondary"} onClick={() => {
              requestRef.current++; setPaymentChoice("property"); setIntent(null); setPaymentError("");
            }}>{t("checkout.payAtProperty")}</Button>
          </div>}
          {phase === "form" && paymentChoice === "property" && <div className="space-y-4 rounded-xl border border-line bg-muted-surface p-5 text-sm">
            <p>{t("checkout.payAtPropertyHint", { amount: money(booking.total_amount) })}</p>
            <Button onClick={confirmProperty} loading={propertyBusy} disabled={cardDisabled}>{t("checkout.confirmProperty")}</Button>
          </div>}
          {phase === "form" && paymentChoice === "stripe" && intent?.client_secret && <StripePaymentForm clientSecret={intent.client_secret} bookingId={id} amount={money(booking.total_amount)} locale={locale} onProcessing={() => setPhase("processing")} disabled={cardDisabled} />}
          {phase === "form" && paymentChoice === "stripe" && !intent?.client_secret && <div className="rounded-xl border border-line bg-muted-surface p-5 text-sm text-muted-ink">
            {preparing ? <p role="status" className="flex items-center gap-2"><CircleNotch aria-hidden size={18} className="animate-spin" />{t("checkout.paymentProcessing")}</p> : <div className="space-y-3"><p role="alert" className="text-danger">{paymentError || t("checkout.paymentFailed")}</p>{stripeConfigured && <Button size="sm" variant="secondary" onClick={preparePayment}>{t("common.retry")}</Button>}</div>}
          </div>}
          {phase === "form" && paymentError && paymentChoice === "property" && <p role="alert" className="text-sm text-danger">{paymentError}</p>}
          {phase === "form" && <Button variant="secondary" onClick={() => setCancellationOpen(true)}
            disabled={propertyBusy || saving || couponBusy}>{t("checkout.cancelBooking")}</Button>}
          {phase !== "form" && <div role="status" className="rounded-xl border border-line bg-muted-surface p-6 text-center">
            {phase === "success" ? <CheckCircle aria-hidden size={44} weight="fill" className="mx-auto text-positive" /> : phase === "expired" ? <XCircle aria-hidden size={44} weight="fill" className="mx-auto text-danger" /> : <CircleNotch aria-hidden size={40} className="mx-auto animate-spin text-brand" />}
            <h3 className="mt-3 text-lg font-semibold text-ink">{t(phase === "success" && booking.payment_method === "property" ? "checkout.propertySuccessTitle" : "checkout." + phase + "Title")}</h3>
            <p className="mt-2 text-sm text-muted-ink">{t(phase === "success" && booking.payment_method === "property" ? "checkout.propertySuccessDescription" : "checkout." + phase + "Description")}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {phase === "success" && <Button href="/trips" size="sm">{t("checkout.viewTrip")}</Button>}
              {phase === "expired" && <Button href={"/rooms/" + listing?.id} size="sm">{t("checkout.bookAgain")}</Button>}
              {phase === "awaiting" && <Button onClick={refreshStatus} size="sm">{t("checkout.checkStatus")}</Button>}
            </div>
          </div>}
        </section>

        <section className="rounded-xl border border-line bg-muted-surface/40 p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-semibold text-ink"><ShieldCheck aria-hidden size={21} className="text-brand" />{t("checkout.cancellation")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-ink"><strong className="text-ink">{t(`cancellation.${booking.cancellation_policy_snapshot?.code || "moderate"}`)}.</strong> {t(`cancellation.${booking.cancellation_policy_snapshot?.code || "moderate"}Description`)}</p>
          <p className="mt-2 text-xs leading-5 text-muted-ink">{t("cancellation.grace")}</p>
          <p className="mt-3 text-xs leading-5 text-muted-ink">{t("checkout.agreement")}</p>
        </section>
      </div>

      <aside className="surface-panel p-5 sm:p-6 lg:sticky lg:top-24">
        <div className="flex gap-4 border-b border-line pb-5">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-muted-surface"><Image src={cover || "/placeholder-room.svg"} alt={listing?.title || t("listing.fallbackTitle")} fill sizes="112px" className="object-cover" /></div>
          <div className="min-w-0"><span className="text-xs text-muted-ink">{listing?.room_type || t("checkout.stay")}</span><h2 className="mt-1 line-clamp-3 font-semibold leading-snug text-ink">{listing?.title}</h2><p className="mt-2 flex items-center gap-1 text-xs text-muted-ink"><MapPin aria-hidden size={15} />{[listing?.city, listing?.country].filter(Boolean).join(", ")}</p></div>
        </div>
        <div className="border-b border-line py-5"><h3 className="font-semibold text-ink">{t("checkout.priceDetails")}</h3>
          <div className="mt-4">{booking.price_breakdown_snapshot?.nights?.length
            ? <PriceBreakdown quote={booking.price_breakdown_snapshot} />
            : <div className="flex justify-between gap-3 text-sm text-muted-ink"><span>{t("checkout.nightlyPrice", { price: money(booking.price_per_night_snapshot), count: nights })}</span><span className="whitespace-nowrap text-ink">{money(booking.total_amount)}</span></div>}</div>
        </div>
        {phase === "form" && <div className="border-b border-line py-5">
          <h3 className="font-semibold text-ink">{t("coupons.code")}</h3>
          {booking.price_breakdown_snapshot?.coupon ? <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-positive">{booking.price_breakdown_snapshot.coupon.code}</span>
            <Button size="sm" variant="ghost" onClick={() => changeCoupon(true)} disabled={couponBusy || cardDisabled}>
              {t("coupons.remove")}</Button></div> : <div className="mt-3 flex gap-2">
            <input aria-label={t("coupons.code")} className="min-w-0 flex-1 rounded-control border border-line bg-surface px-3 py-2 text-ink"
              value={couponCode} maxLength={40} onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => { if (event.key === "Enter") changeCoupon(); }} />
            <Button size="sm" onClick={() => changeCoupon()} disabled={couponBusy || cardDisabled || !couponCode.trim()}>
              {t("coupons.apply")}</Button></div>}
          {couponError && <p role="alert" className="mt-2 text-sm text-danger">{couponError}</p>}
        </div>}
        <div className="flex items-center justify-between gap-2 py-5 font-bold text-ink"><span>{t("checkout.total")}</span><span className="text-xl text-brand">{money(booking.total_amount)}</span></div>
        {paymentChoice === "stripe" && <div className="rounded-xl border border-positive/20 bg-positive/10 p-4 text-sm text-positive"><div className="flex gap-2"><ShieldCheck aria-hidden size={20} className="shrink-0" /><span>{t("checkout.confirmedAfterPayment")}</span></div></div>}
        {paymentChoice === "stripe" && <p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-xs leading-5 text-muted-ink"><LockKey aria-hidden size={16} className="mt-0.5 shrink-0" />{t("checkout.secureStripe")}</p>}
      </aside>
    </div>
  </Container>;
}
