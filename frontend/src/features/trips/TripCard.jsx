"use client";

import Link from "next/link";
import Image from "next/image";
import { CheckCircle, CreditCard, Star } from "@phosphor-icons/react";
import { formatVND } from "@/lib/format";
import { useLocale } from "@/i18n/LocaleProvider";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";

function badge(status) {
  switch (status) {
    case "confirmed":
      return "success";
    case "pending_payment":
      return "warning";
    case "cancelled":
      return "neutral";
    case "completed":
      return "brand";
    default:
      return "neutral";
  }
}

function statusLabel(status, t) {
  switch (status) {
    case "pending_payment":
      return t("trips.statusPending");
    case "confirmed":
      return t("trips.statusConfirmed");
    case "completed":
      return t("trips.statusCompleted");
    case "cancelled":
      return t("trips.statusCancelled");
    default:
      return status;
  }
}

export default function TripCard({
  booking,
  busy,
  onCheckout,
  onRepay,
  onCancel,
}) {
  const { locale, t } = useLocale();
  const listing = booking.listing;
  const cover = listing?.cover_url;
  const lastPayment = (booking.payments || [])[0];
  const isPaid = lastPayment?.status === "succeeded";

  return (
    <article className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-40 w-full overflow-hidden rounded-xl sm:h-32 sm:w-48">
          <Image
            src={cover || "https://picsum.photos/seed/trip/600/400"}
            alt={listing?.title || t("trips.stayFallback")}
            fill
            sizes="(max-width: 640px) 100vw, 192px"
            className="object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-ink">
              {listing?.title || t("trips.stayFallback")}
            </h2>
            <Badge tone={badge(booking.status)}>
              {statusLabel(booking.status, t)}
            </Badge>
          </div>
          <div className="mt-1 text-sm text-muted-ink">
            {t("trips.dateGuests", {
              checkIn: booking.check_in,
              checkOut: booking.check_out,
              guests: booking.guests_count,
            })}
          </div>
          <div className="mt-1 text-sm text-ink">
            {t("trips.total")}:{" "}
            <span className="font-semibold">
              {formatVND(
                booking.total_amount,
                locale === "en" ? "en-US" : "vi-VN",
              )}
            </span>
          </div>
          {lastPayment && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-ink">
              <CreditCard aria-hidden size={14} />
              {t("trips.payment", {
                provider: lastPayment.provider,
                status: lastPayment.status,
              })}
            </div>
          )}

          {booking.review && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-ink">
              <Star aria-hidden size={14} weight="fill" className="text-brand" />
              {t("trips.reviewed", { rating: booking.review.rating })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={`/rooms/${listing?.id}`}
            className="inline-flex min-h-10 items-center rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-muted-surface"
          >
            {t("trips.viewStay")}
          </Link>

          {!booking.can_review && booking.review && (
            <Link
              href={`/rooms/${listing?.id}#reviews`}
              className="inline-flex min-h-10 items-center rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-muted-surface"
            >
              {t("trips.viewReview")}
            </Link>
          )}

          {booking.can_review && (
            <Link
              href={`/rooms/${listing?.id}?review=1#reviews`}
              className="inline-flex min-h-10 items-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              {t("trips.review")}
            </Link>
          )}

          {booking.status === "confirmed" && isPaid && (
            <Button
              onClick={() => onCheckout(booking.id)}
              disabled={busy.checkoutId === booking.id}
              size="sm"
            >
              <CheckCircle aria-hidden size={17} />
              {busy.checkoutId === booking.id
                ? t("trips.checkingOut")
                : t("trips.checkout")}
            </Button>
          )}

          {booking.status === "pending_payment" && (
            <>
              <Button
                onClick={() => onRepay(booking.id)}
                disabled={busy.repayId === booking.id}
                size="sm"
              >
                {busy.repayId === booking.id
                  ? t("trips.creatingPayment")
                  : t("trips.pay")}
              </Button>
              <Button
                onClick={() => onCancel(booking.id)}
                disabled={busy.cancelId === booking.id}
                variant="secondary"
                size="sm"
              >
                {busy.cancelId === booking.id
                  ? t("trips.cancelling")
                  : t("common.cancel")}
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
