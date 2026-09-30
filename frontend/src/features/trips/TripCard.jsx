"use client";

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
    <article className="surface-panel overflow-hidden p-3 sm:p-4">
      <div className="grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="relative min-h-52 w-full overflow-hidden rounded-control bg-muted-surface sm:h-full">
          <Image
            src={cover || "/placeholder-room.svg"}
            alt={listing?.title || t("trips.stayFallback")}
            fill
            sizes="(max-width: 640px) 90vw, 260px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 p-2 sm:py-3 sm:pr-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone={badge(booking.status)}>
              {statusLabel(booking.status, t)}
            </Badge>
          </div>
          <h2 className="line-clamp-2 text-2xl font-bold tracking-tight text-ink">{listing?.title || t("trips.stayFallback")}</h2>
          <div className="mt-3 text-sm leading-6 text-muted-ink">
            {t("trips.dateGuests", {
              checkIn: booking.check_in,
              checkOut: booking.check_out,
              guests: booking.guests_count,
            })}
          </div>
          <div className="mt-3 text-sm text-ink">
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
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
          <Button
            href={`/rooms/${listing?.id}`}
            variant="secondary" size="sm"
          >
            {t("trips.viewStay")}
          </Button>

          {!booking.can_review && booking.review && (
            <Button
              href={`/rooms/${listing?.id}#reviews`}
              variant="secondary" size="sm"
            >
              {t("trips.viewReview")}
            </Button>
          )}

          {booking.can_review && (
            <Button
              href={`/rooms/${listing?.id}?review=1#reviews`}
              size="sm"
            >
              {t("trips.review")}
            </Button>
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
      </div>
    </article>
  );
}
