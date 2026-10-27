"use client";

import { useLocale, useTranslations } from "@/i18n/LocaleProvider";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import UserAvatar from "@/components/atoms/UserAvatar";
import CopyId from "@/components/molecules/CopyId";
import { Eye } from "lucide-react";
import { statusTone, paymentTone, money, formatDateOnly } from "@/lib/BookingUtils";

export default function BookingsTable({ pagedItems, filtered, openDetail }) {
  const t = useTranslations();
  const { locale } = useLocale();
  const createdDate = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="overflow-x-auto border ui-border ui-panel">
      <table className="admin-booking-table w-full text-left text-[13px]">
        <colgroup>
          <col className="w-[13%]" /><col className="w-[16%]" /><col className="w-[17%]" /><col className="w-[13%]" />
          <col className="w-[12%]" /><col className="w-[10%]" /><col className="w-[10%]" /><col className="w-[9%]" />
        </colgroup>
        <thead>
          <tr>
            <th className="px-3">{t("bookings.tripCode")}</th>
            <th className="px-3">{t("common.user")}</th>
            <th className="px-3">{t("common.listing")}</th>
            <th className="px-3">{t("common.dates")}</th>
            <th className="px-3">{t("common.total")}</th>
            <th className="px-3">{t("common.status")}</th>
            <th className="px-3">{t("common.payment")}</th>
            <th className="px-3 text-right">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {pagedItems.map((b) => (
            <tr key={b.id} className="border-t ui-border">
              <td className="px-3">
                <span className="font-mono text-xs">{b.booking_code || "—"}</span>
                <div className="mt-1 text-xs ui-muted">{b.created_at ? createdDate.format(new Date(b.created_at)) : "—"}</div>
              </td>
              <td className="px-3">
                <div className="flex min-w-0 items-center gap-2">
                  <UserAvatar user={b.guest} />
                  <div className="min-w-0">
                    <div className="truncate font-medium" title={b.guest?.email}>{b.guest?.email || "—"}</div>
                    <CopyId value={b.guest?.id} />
                  </div>
                </div>
              </td>
              <td className="px-3">
                <div className="line-clamp-2 font-medium" title={b.listing?.title}>{b.listing?.title || "—"}</div>
                <span className="font-mono text-xs ui-muted">{b.listing?.listing_code || "—"}</span>
              </td>
              <td className="px-3">
                <div className="admin-stay-dates">
                  <span>{formatDateOnly(b.check_in)}</span>
                  <span className="ui-muted">→ {formatDateOnly(b.check_out)}</span>
                </div>
                {b.nights ? <div className="mt-1 text-xs ui-muted">{t("bookings.nightsCount", { count: b.nights })}</div> : null}
              </td>
              <td className="px-3 whitespace-nowrap font-semibold">{money(b.total_amount, locale)} ₫</td>
              <td className="px-3"><Badge tone={statusTone(b.status)}>{b.status ? t(`statuses.${b.status}`) : "—"}</Badge></td>
              <td className="px-3">
                <Badge tone={paymentTone(b.last_payment_status)}>{b.last_payment_status ? t(`statuses.${b.last_payment_status}`) : "—"}</Badge>
                {b.last_payment_provider ? <div className="mt-1 text-xs ui-muted">{b.last_payment_provider}</div> : null}
              </td>
              <td className="px-3 text-right">
                <Button variant="secondary" size="sm" onClick={() => openDetail(b.id)}><Eye size={15} aria-hidden="true" />{t("common.view")}</Button>
              </td>
            </tr>
          ))}
          {!filtered.length ? <tr><td className="px-3 py-10 text-center ui-muted" colSpan={8}>{t("bookings.empty")}</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
