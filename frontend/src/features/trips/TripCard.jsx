"use client";

import { useState } from "react";
import Image from "next/image";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  Bed,
  CalendarBlank,
  CalendarCheck,
  CheckCircle,
  Clock,
  CreditCard,
  Images,
  Key,
  MapPin,
  Phone,
  Receipt,
  Star,
  Tag,
  Wallet,
  XCircle,
} from "@phosphor-icons/react";
import { formatVND } from "@/lib/format";
import { useLocale } from "@/i18n/LocaleProvider";
import Avatar from "@/components/atoms/Avatar";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import StayQrPanel from "./StayQrPanel";

const paymentStatusKeys = {
  succeeded: "trips.paymentStatusSucceeded",
  pending: "trips.paymentStatusPending",
  cancelled: "trips.paymentStatusCancelled",
  failed: "trips.paymentStatusFailed",
  refunded: "trips.paymentStatusRefunded",
};

function badge(status) {
  switch (status) {
    case "confirmed":
      return "success";
    case "pending_payment":
      return "warning";
    case "cancelled":
      return "danger";
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

/** Giữ phần tóm tắt gọn; chỉ mở thông tin cá nhân và mã chuyến đi, mã phòng khi khách yêu cầu. */
export default function TripCard({
  booking,
  booker,
  busy,
  onCheckout,
  onRepay,
  onCancel,
}) {
  const { locale, t } = useLocale();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const listing = booking.listing;
  const lastPayment = (booking.payments || [])[0];
  const isPaid = lastPayment?.status === "succeeded";
  const canComplete =
    booking.status === "confirmed" &&
    isPaid &&
    booking.check_out <= new Date().toISOString().slice(0, 10);
  const checkIn = format(parseISO(booking.check_in), "dd/MM/yyyy");
  const checkOut = format(parseISO(booking.check_out), "dd/MM/yyyy");
  const bookedOn = booking.created_at
    ? format(parseISO(booking.created_at), "dd/MM/yyyy")
    : null;
  const nights = differenceInCalendarDays(
    parseISO(booking.check_out),
    parseISO(booking.check_in),
  );
  const paymentStatus = lastPayment
    ? t(
        lastPayment.provider === "property" && lastPayment.status === "pending"
          ? "trips.paymentDueAtProperty"
          : paymentStatusKeys[lastPayment.status] ||
              "trips.paymentStatusUnknown",
      )
    : "";
  const paymentProvider =
    lastPayment?.provider === "stripe"
      ? "Stripe"
      : lastPayment?.provider === "property"
        ? t("checkout.payAtProperty")
        : lastPayment?.provider;
  const location = [listing?.city, listing?.country].filter(Boolean).join(", ");
  const renterName = booking.renter?.name;
  const renterPhone = booking.renter?.phone;
  const renterAvatar = booking.renter?.avatar_url;
  const bookerName = booker?.full_name;
  const separateRenter = Boolean(
    renterName && bookerName && renterName.trim() !== bookerName.trim(),
  );
  const profileName = separateRenter ? bookerName : renterName || bookerName;
  const profileAvatar =
    booker?.avatar_url || booker?.avatar || booker?.photo_url || renterAvatar;
  const detailsId = `trip-details-${booking.id}`;
  const stayStatus = booking.stay_status || "not_checked_in";

  return (
    <article className="surface-panel overflow-hidden p-3 sm:p-4 lg:p-5 xl:h-[400px]">
      <div className="flex flex-col xl:h-full xl:flex-row">
        <div className="grid min-w-0 flex-1 grid-cols-[104px_minmax(0,1fr)] gap-x-3 gap-y-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-5 lg:grid-cols-[minmax(220px,1fr)_minmax(0,1.2fr)_minmax(190px,.75fr)] xl:h-full xl:min-h-0 xl:grid-cols-[minmax(220px,1.1fr)_minmax(0,1.25fr)_minmax(190px,.75fr)] xl:gap-7">
          <div className="relative min-h-32 overflow-hidden rounded-control bg-muted-surface sm:min-h-48 lg:h-full">
            <Image
              src={listing?.cover_url || "/placeholder-room.svg"}
              alt={listing?.title || t("trips.stayFallback")}
              fill
              sizes="(max-width: 639px) 104px, (max-width: 1023px) 180px, (max-width: 1280px) 30vw, 300px"
              className="object-cover"
            />
            {Number(listing?.image_count) > 0 && (
              <span className="absolute bottom-3 left-3 hidden items-center gap-1.5 rounded-lg bg-[#0c1710]/80 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm sm:inline-flex">
                <Images aria-hidden size={16} />
                {t("trips.photoCount", { count: listing.image_count })}
              </span>
            )}
          </div>

          <div className="contents lg:block lg:min-w-0 lg:py-2">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-1.5 lg:mb-4">
                <Badge tone={badge(booking.status)}>
                  {booking.status === "cancelled" ? (
                    <XCircle aria-hidden size={15} />
                  ) : booking.status === "pending_payment" ? (
                    <Clock aria-hidden size={15} />
                  ) : (
                    <CalendarCheck aria-hidden size={15} />
                  )}
                  {statusLabel(booking.status, t)}
                </Badge>
                {(["confirmed", "completed"].includes(booking.status) ||
                  stayStatus === "no_show") && (
                  <Badge
                    tone={
                      stayStatus === "no_show"
                        ? "danger"
                        : stayStatus === "not_checked_in"
                          ? "neutral"
                          : "success"
                    }
                  >
                    {t(`stay.${stayStatus}`)}
                  </Badge>
                )}
              </div>
              {stayStatus === "checked_in" && booking.actual_check_in_at && (
                <p className="mb-2 text-xs text-muted-ink">
                  {t("stay.checkedInAt", {
                    time: new Intl.DateTimeFormat(
                      locale === "en" ? "en-GB" : "vi-VN",
                      {
                        timeZone: "Asia/Ho_Chi_Minh",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      },
                    ).format(new Date(booking.actual_check_in_at)),
                  })}
                </p>
              )}
              <h2 className="line-clamp-2 text-base font-bold leading-snug tracking-[-0.035em] text-ink sm:text-2xl">
                {listing?.title || t("trips.stayFallback")}
              </h2>
              <div className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-muted-ink sm:mt-4 sm:items-center sm:gap-2 sm:text-sm">
                <CalendarBlank
                  aria-hidden
                  size={16}
                  className="mt-0.5 shrink-0 sm:mt-0 sm:h-[18px] sm:w-[18px]"
                />
                <span>
                  {t("trips.dateGuests", {
                    checkIn,
                    checkOut,
                    guests: booking.guests_count,
                  })}
                </span>
              </div>
              {location && (
                <div className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-muted-ink sm:mt-2 sm:items-center sm:gap-2 sm:text-sm">
                  <MapPin
                    aria-hidden
                    size={16}
                    className="mt-0.5 shrink-0 sm:mt-0 sm:h-[18px] sm:w-[18px]"
                  />
                  <span className="line-clamp-1 sm:line-clamp-none">
                    {location}
                  </span>
                </div>
              )}
            </div>
            <div className="col-span-2 space-y-1.5 border-t border-line pt-3 lg:mt-4 lg:space-y-2 lg:pt-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Tag aria-hidden size={18} className="shrink-0" />
                <span>
                  {t("trips.total")}:{" "}
                  {formatVND(
                    booking.total_amount,
                    locale === "en" ? "en-US" : "vi-VN",
                  )}
                </span>
              </p>
              {lastPayment && (
                <p className="flex items-center gap-2 text-sm text-muted-ink">
                  <CreditCard aria-hidden size={18} className="shrink-0" />
                  <span
                    aria-hidden
                    className={`h-2 w-2 shrink-0 rounded-full ${lastPayment.status === "succeeded" ? "bg-positive" : lastPayment.status === "pending" ? "bg-caution" : "bg-danger"}`}
                  />
                  <span>
                    {t("trips.payment", {
                      provider: paymentProvider,
                      status: paymentStatus,
                    })}
                  </span>
                </p>
              )}
              <p className="hidden items-center gap-2 text-sm text-muted-ink lg:flex">
                <Bed aria-hidden size={18} className="shrink-0" />
                {t("checkout.nights", { count: nights })}
              </p>
            </div>
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-2 lg:col-auto lg:flex lg:flex-col lg:justify-center lg:gap-3">
            <Button
              href={`/rooms/${listing?.id}`}
              size="sm"
              className="order-2 w-full !px-1.5 text-xs sm:text-sm lg:order-none lg:!px-4"
            >
              <CalendarBlank
                aria-hidden
                size={19}
                className="hidden lg:block"
              />
              {t("trips.viewStay")}
            </Button>
            {booking.status === "confirmed" && isPaid && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className={`order-1 col-span-2 w-full lg:order-none ${canComplete ? "" : "hidden lg:inline-flex"}`}
                  onClick={() => onCheckout(booking.id)}
                  disabled={!canComplete || busy.checkoutId === booking.id}
                >
                  <CheckCircle aria-hidden size={19} />
                  {busy.checkoutId === booking.id
                    ? t("trips.checkingOut")
                    : t("trips.checkout")}
                </Button>
                {!canComplete && (
                  <p className="order-4 col-span-2 text-center text-xs leading-5 text-muted-ink lg:order-none">
                    {t("trips.completeAfterCheckout", { date: checkOut })}
                  </p>
                )}
              </>
            )}
            {booking.status === "pending_payment" && (
              <>
                <Button
                  onClick={() => onRepay(booking.id)}
                  disabled={busy.repayId === booking.id}
                  size="sm"
                  className="order-1 col-span-2 w-full lg:order-none"
                >
                  <Wallet aria-hidden size={19} />
                  {busy.repayId === booking.id
                    ? t("trips.creatingPayment")
                    : t("trips.pay")}
                </Button>
              </>
            )}
            {["pending_payment", "confirmed"].includes(booking.status) &&
              stayStatus === "not_checked_in" &&
              booking.check_out > new Date().toISOString().slice(0, 10) && (
                <Button
                  onClick={() => onCancel(booking.id)}
                  variant="secondary"
                  size="sm"
                  className="order-4 col-span-2 w-full lg:order-none"
                >
                  <XCircle aria-hidden size={19} />
                  {t("common.cancel")}
                </Button>
              )}
            {(booking.can_review || booking.review) && (
              <Button
                href={`/rooms/${listing?.id}${booking.can_review ? "?review=1" : ""}#reviews`}
                variant="secondary"
                size="sm"
                className="order-4 col-span-2 w-full lg:order-none"
              >
                <Star aria-hidden size={19} />
                {t(booking.can_review ? "trips.review" : "trips.viewReview")}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="order-3 w-full !px-1.5 text-xs sm:text-sm lg:order-none lg:!px-4"
              onClick={() => setDetailsOpen((open) => !open)}
              aria-label={`${t(detailsOpen ? "trips.hideBookingDetails" : "trips.bookingDetails")}: ${listing?.title || t("trips.stayFallback")}`}
              aria-expanded={detailsOpen}
              aria-controls={detailsId}
            >
              <Receipt aria-hidden size={19} className="hidden lg:block" />
              <span className="lg:hidden">
                {t(
                  detailsOpen
                    ? "trips.hideBookingDetailsShort"
                    : "trips.bookingDetailsShort",
                )}
              </span>
              <span className="hidden lg:inline">
                {t(
                  detailsOpen
                    ? "trips.hideBookingDetails"
                    : "trips.bookingDetails",
                )}
              </span>
            </Button>
          </div>
        </div>

        <aside
          id={detailsId}
          aria-hidden={!detailsOpen}
          className={`min-w-0 overflow-hidden motion-safe:transition-[max-height,margin,opacity,padding,transform,width] motion-safe:duration-300 motion-safe:ease-out xl:h-full xl:max-h-full xl:min-h-0 xl:shrink-0 ${
            detailsOpen
              ? "mt-5 max-h-[1000px] translate-y-0 border-t border-line pt-5 opacity-100 xl:ml-7 xl:mt-0 xl:w-[320px] xl:overflow-y-auto xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0"
              : "pointer-events-none mt-0 max-h-0 -translate-y-2 pt-0 opacity-0 xl:ml-0 xl:w-0 xl:translate-y-0 xl:pl-0"
          }`}
        >
          <h3 className="border-b border-line pb-4 text-lg font-bold text-ink">
            {t("trips.bookingDetails")}
          </h3>
          {["confirmed", "completed"].includes(booking.status) && (
            <StayQrPanel
              key={`${booking.id}:${stayStatus}`}
              booking={booking}
            />
          )}
          <div className="flex items-center gap-3 py-5">
            <Avatar
              src={profileAvatar}
              name={profileName || t("common.account")}
              size={52}
              className="shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs text-muted-ink">
                {t(
                  separateRenter
                    ? "trips.bookingAccount"
                    : "chat.proposal.renterName",
                )}
              </p>
              <p className="mt-1 break-words font-semibold text-ink">
                {profileName || t("trips.notProvided")}
              </p>
            </div>
          </div>
          <dl className="divide-y divide-line text-sm">
            {separateRenter && (
              <div className="flex items-start justify-between gap-3 py-3">
                <dt className="text-muted-ink">
                  {t("chat.proposal.renterName")}
                </dt>
                <dd className="max-w-[60%] break-words text-right font-medium text-ink">
                  {renterName}
                </dd>
              </div>
            )}
            <div className="flex items-start justify-between gap-3 py-3">
              <dt className="flex shrink-0 items-center gap-2 text-muted-ink">
                <Key aria-hidden size={18} />
                {t("trips.bookingCode")}
              </dt>
              <dd className="max-w-[60%] break-all text-right font-semibold text-brand">
                {booking.booking_code || t("trips.notProvided")}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3 py-3">
              <dt className="flex shrink-0 items-center gap-2 text-muted-ink">
                <Bed aria-hidden size={18} />
                {t("trips.roomCode")}
              </dt>
              <dd className="max-w-[60%] break-all text-right font-semibold text-brand">
                {listing?.listing_code || t("trips.notProvided")}
              </dd>
            </div>
            {lastPayment && (
              <div className="flex items-start justify-between gap-3 py-3">
                <dt className="flex shrink-0 items-center gap-2 text-muted-ink">
                  <CreditCard aria-hidden size={18} />
                  {t("trips.transactionCode")}
                </dt>
                <dd className="max-w-[60%] break-all text-right font-semibold text-brand">
                  {lastPayment.payment_code || t("trips.notProvided")}
                </dd>
              </div>
            )}
            {bookedOn && (
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="flex items-center gap-2 text-muted-ink">
                  <CalendarBlank aria-hidden size={18} />
                  {t("trips.bookingDate")}
                </dt>
                <dd className="font-medium text-ink">{bookedOn}</dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 py-3">
              <dt className="flex min-w-0 items-center gap-2 text-muted-ink">
                <Phone aria-hidden size={18} className="shrink-0" />
                {t("chat.proposal.renterPhone")}
              </dt>
              <dd className="shrink-0 whitespace-nowrap text-right font-medium tabular-nums text-ink">
                {renterPhone || t("trips.notProvided")}
              </dd>
            </div>
          </dl>
          {booking.cancellation && (
            <div className="mt-4 rounded-control border border-line bg-muted-surface/40 p-3 text-sm">
              <p className="font-semibold text-ink">
                {t("cancellation.refund")}:{" "}
                {formatVND(
                  booking.cancellation.refund_amount,
                  locale === "en" ? "en-US" : "vi-VN",
                )}
              </p>
              <p className="mt-1 text-muted-ink">
                {t("cancellation.fee")}:{" "}
                {formatVND(
                  booking.cancellation.non_refundable_amount,
                  locale === "en" ? "en-US" : "vi-VN",
                )}
              </p>
              {booking.refunds?.[0] && (
                <p className="mt-2 text-xs text-brand">
                  {t("cancellation.refundStatus")}:{" "}
                  {t(
                    `cancellation.${booking.refunds[0].status === "processing" ? "processingStatus" : booking.refunds[0].status}`,
                  )}
                </p>
              )}
            </div>
          )}
          {booking.actual_check_out_at && (
            <p className="mt-1 text-xs text-muted-ink">
              {t("stay.actualCheckOut")}:{" "}
              {new Date(booking.actual_check_out_at).toLocaleString("en-GB")}
            </p>
          )}
        </aside>
      </div>
    </article>
  );
}
