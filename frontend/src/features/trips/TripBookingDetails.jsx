"use client";

import { format, parseISO } from "date-fns";
import { Bed, CalendarBlank, CreditCard, Key, Phone } from "@phosphor-icons/react";
import Avatar from "@/components/atoms/Avatar";
import { formatVND } from "@/lib/format";
import { useLocale } from "@/i18n/LocaleProvider";
import StayQrPanel from "./StayQrPanel";

/** Chỉ tải mã QR và thông tin cá nhân khi khách mở chi tiết chuyến đi. */
export default function TripBookingDetails({ booking, booker }) {
  const { locale, t } = useLocale();
  const listing = booking.listing;
  const lastPayment = booking.payments?.[0];
  const stayStatus = booking.stay_status || "not_checked_in";
  const bookedOn = booking.created_at ? format(parseISO(booking.created_at), "dd/MM/yyyy") : null;
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
  return <>
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
      {[
        ["trips.bookingCode", Key, booking.booking_code],
        ["trips.roomCode", Bed, listing?.listing_code],
        ...(lastPayment ? [["trips.transactionCode", CreditCard, lastPayment.payment_code]] : []),
      ].map(([label, Icon, value]) => (
        <div key={label} className="flex items-start justify-between gap-3 py-3">
          <dt className="flex shrink-0 items-center gap-2 text-muted-ink">
            <Icon aria-hidden size={18} />{t(label)}
          </dt>
          <dd className="max-w-[60%] break-all text-right font-semibold text-brand">
            {value || t("trips.notProvided")}
          </dd>
        </div>
      ))}
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
        {new Date(booking.actual_check_out_at).toLocaleString(locale === "en" ? "en-GB" : "vi-VN")}
      </p>
    )}
  </>;
}
