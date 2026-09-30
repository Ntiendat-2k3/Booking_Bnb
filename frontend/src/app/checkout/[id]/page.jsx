"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  Minus,
  Plus,
  ShieldCheck,
  Star,
} from "@phosphor-icons/react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { createStripePayment, updateBooking } from "@/services/bookingService";
import { apiFetch } from "@/lib/api";
import { formatVND } from "@/lib/format";
import Container from "@/components/layout/Container";
import Button from "@/components/atoms/Button";
import IconButton from "@/components/atoms/IconButton";
import InputField from "@/components/atoms/InputField";
import { useLocale } from "@/i18n/LocaleProvider";
import Image from "next/image";
import { format } from "date-fns";

export default function CheckoutPage() {
  const { locale, t } = useLocale();
  const { id } = useParams();
  const router = useRouter();
  const user = useSelector((s) => s.auth.user);
  const isInitialized = useSelector((s) => s.auth.isInitialized);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const [editingDates, setEditingDates] = useState(false);
  const [editingGuests, setEditingGuests] = useState(false);
  const [draftCheckIn, setDraftCheckIn] = useState("");
  const [draftCheckOut, setDraftCheckOut] = useState("");
  const [draftGuests, setDraftGuests] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchBooking() {
      if (!isInitialized) return;
      if (!user) {
        notifyInfo(t("checkout.loginRequired"));
        router.push("/login");
        return;
      }

      try {
        const res = await apiFetch(`/api/v1/bookings/${id}`);
        setBooking(res.data.booking);
      } catch (err) {
        notifyError(t("checkout.bookingNotFound"));
        router.push("/trips");
      } finally {
        setLoading(false);
      }
    }
    fetchBooking();
  }, [id, user, isInitialized, router, t]);

  function startEditDates() {
    setDraftCheckIn(booking.check_in);
    setDraftCheckOut(booking.check_out);
    setEditingDates(true);
  }

  function startEditGuests() {
    setDraftGuests(booking.guests_count);
    setEditingGuests(true);
  }

  async function saveDates() {
    if (saving) return;
    if (!draftCheckIn || !draftCheckOut || draftCheckIn < format(new Date(), "yyyy-MM-dd") || draftCheckOut <= draftCheckIn) {
      notifyInfo(t("booking.invalidDates"));
      return;
    }
    if (draftCheckIn === booking.check_in && draftCheckOut === booking.check_out) {
      setEditingDates(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateBooking(id, {
        check_in: draftCheckIn,
        check_out: draftCheckOut,
      });
      setBooking(updated);
      setEditingDates(false);
      notifySuccess(t("checkout.datesUpdated"));
    } catch (err) {
      notifyError(err?.message || t("checkout.datesUpdateFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function saveGuests() {
    if (saving || !Number.isInteger(Number(draftGuests)) || Number(draftGuests) < 1 || Number(draftGuests) > (booking.listing?.max_guests || 16)) return;
    if (Number(draftGuests) === booking.guests_count) {
      setEditingGuests(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateBooking(id, {
        guests_count: Number(draftGuests),
      });
      setBooking(updated);
      setEditingGuests(false);
      notifySuccess(t("checkout.guestsUpdated"));
    } catch (err) {
      notifyError(err?.message || t("checkout.guestsUpdateFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handlePayment() {
    if (paying || saving || editingDates || editingGuests) return;
    setPaying(true);
    try {
      const url = await createStripePayment(id);
      if (!url) throw new Error(t("checkout.paymentUrlFailed"));
      notifySuccess(t("checkout.paymentRedirect"));
      window.location.href = url;
    } catch (e) {
      notifyError(e?.message || t("checkout.paymentFailed"));
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <Container>
        <div className="py-20 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        </div>
      </Container>
    );
  }

  if (!booking) return null;

  const { listing } = booking;
  const cover = listing?.images?.find((img) => img.is_cover) || listing?.images?.[0];
  const maxGuests = listing?.max_guests || 16;
  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <Container>
      <div className="py-4 sm:py-6">
        <h1 className="page-heading mb-8 flex items-center gap-3">
          <IconButton
            onClick={() => router.back()}
            label={t("common.back")}
          >
            <ArrowLeft aria-hidden size={24} weight="bold" />
          </IconButton>
          {t("checkout.title")}
        </h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-12">
          <div className="surface-panel space-y-8 p-6 sm:p-8">
            <section className="space-y-5 border-b border-line pb-10">
              <h2 className="text-2xl font-bold tracking-[-0.025em] text-ink">
                {t("checkout.trip")}
              </h2>

              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-ink">{t("checkout.dates")}</h3>
                  {editingDates ? (
                    <div className="mt-2 space-y-3">
                      <div className="flex flex-wrap gap-3">
                          <InputField label={t("checkout.checkIn")}
                            type="date"
                            value={draftCheckIn}
                            min={todayStr}
                            max={draftCheckOut}
                            onChange={(e) => setDraftCheckIn(e.target.value)}
                          />
                          <InputField label={t("checkout.checkOut")}
                            type="date"
                            value={draftCheckOut}
                            min={draftCheckIn || todayStr}
                            onChange={(e) => setDraftCheckOut(e.target.value)}
                          />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={saveDates}
                          disabled={saving}
                          size="sm"
                        >
                          {saving ? t("checkout.saving") : t("common.save")}
                        </Button>
                        <Button
                          onClick={() => setEditingDates(false)}
                          disabled={saving}
                          variant="ghost"
                          size="sm"
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-ink">
                      {booking.check_in} → {booking.check_out}
                    </p>
                  )}
                </div>
                {!editingDates && (
                  <Button variant="ghost" size="sm"
                    onClick={startEditDates}
                    className="ml-4 shrink-0 text-brand"
                  >
                    {t("common.edit")}
                  </Button>
                )}
              </div>

              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-ink">{t("checkout.guests")}</h3>
                  {editingGuests ? (
                    <div className="mt-2 space-y-3">
                      <div className="flex items-center gap-3">
                        <IconButton
                          onClick={() => setDraftGuests((g) => Math.max(1, g - 1))}
                          disabled={saving || draftGuests <= 1}
                          label={t("common.previous")}
                        >
                          <Minus aria-hidden size={18} weight="bold" />
                        </IconButton>
                        <span className="min-w-[3ch] text-center text-lg font-semibold text-ink">
                          {draftGuests}
                        </span>
                        <IconButton
                          onClick={() => setDraftGuests((g) => Math.min(maxGuests, g + 1))}
                          disabled={saving || draftGuests >= maxGuests}
                          label={t("common.next")}
                        >
                          <Plus aria-hidden size={18} weight="bold" />
                        </IconButton>
                        <span className="ml-1 text-xs text-muted-ink">
                          {t("checkout.maxGuests", { count: maxGuests })}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={saveGuests}
                          disabled={saving}
                          size="sm"
                        >
                          {saving ? t("checkout.saving") : t("common.save")}
                        </Button>
                        <Button
                          onClick={() => setEditingGuests(false)}
                          disabled={saving}
                          variant="ghost"
                          size="sm"
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-ink">
                      {t("checkout.guestCount", {
                        count: booking.guests_count,
                      })}
                    </p>
                  )}
                </div>
                {!editingGuests && (
                  <Button variant="ghost" size="sm"
                    onClick={startEditGuests}
                    className="ml-4 shrink-0 text-brand"
                  >
                    {t("common.edit")}
                  </Button>
                )}
              </div>
            </section>

            <section className="space-y-4 border-b border-line pb-10">
              <h2 className="text-2xl font-bold tracking-[-0.025em] text-ink">
                {t("checkout.paymentMethod")}
              </h2>
              <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-muted-surface text-ink">
                    <CreditCard aria-hidden size={24} />
                  </span>
                  <span className="font-semibold text-ink">
                    {t("checkout.stripeCard")}
                  </span>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold tracking-[-0.025em] text-ink">
                {t("checkout.cancellation")}
              </h2>
              <p className="leading-7 text-muted-ink">
                <span className="font-semibold text-ink">
                  {t("checkout.cancellationLead")}
                </span>{" "}
                {t("checkout.cancellationBody")}
              </p>
              <p className="mt-4 text-xs leading-5 text-muted-ink">
                {t("checkout.agreement")}
              </p>
            </section>

            <Button
              onClick={handlePayment}
                disabled={paying || saving || editingDates || editingGuests}
              loading={paying}
              className="w-full lg:w-max"
              size="lg"
            >
              {paying
                ? t("checkout.paymentProcessing")
                : t("checkout.confirmPayment")}
            </Button>
          </div>

          <div className="relative">
            <div className="surface-panel sticky top-28 p-6">
              <div className="flex gap-4 border-b border-line pb-6">
                <div className="relative h-[106px] w-[124px] shrink-0 overflow-hidden rounded-xl">
                  <Image
                    src={cover?.url || "/placeholder-room.svg"}
                    alt={listing?.title || t("listing.fallbackTitle")}
                    fill
                    sizes="124px"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-start">
                  <div className="mb-1 text-xs font-semibold uppercase text-muted-ink">
                    {listing?.category || t("listing.fallbackTitle")}
                  </div>
                  <div className="line-clamp-2 text-sm font-medium text-ink">
                    {listing?.title}
                  </div>
                  <div className="mt-auto flex items-center gap-1 text-xs text-muted-ink">
                    <Star aria-hidden size={14} weight="fill" className="text-brand" />
                    <span>{Number(listing?.avg_rating) > 0 ? Number(listing.avg_rating).toFixed(1) : t("common.new")}</span>
                  </div>
                </div>
              </div>

              <div className="border-b border-line py-6">
                <h2 className="mb-4 text-xl font-bold text-ink">
                  {t("checkout.priceDetails")}
                </h2>

                <div className="mb-3 flex items-center justify-between text-muted-ink">
                  <span>
                    {formatVND(
                      booking.total_amount,
                      locale === "en" ? "en-US" : "vi-VN",
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 text-lg font-bold text-ink">
                <span>{t("checkout.total")}</span>
                <span>
                  {formatVND(
                    booking.total_amount,
                    locale === "en" ? "en-US" : "vi-VN",
                  )}
                </span>
              </div>
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-ink">
                <ShieldCheck aria-hidden size={16} />
                {t("payments.providers.stripe")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
