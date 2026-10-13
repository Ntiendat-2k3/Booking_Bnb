"use client";

import { useLocale, useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import Badge from "@/components/atoms/Badge";
import UserAvatar from "@/components/atoms/UserAvatar";
import CopyId from "@/components/molecules/CopyId";
import Image from "next/image";
import { Eye } from "lucide-react";

export function getStatusColor(st) {
  switch (st) {
    case "completed":
    case "success":
    case "succeeded":
      return "emerald";
    case "failed":
      return "rose";
    case "refunded":
      return "amber";
    case "pending":
      return "amber";
    default:
      return "zinc";
  }
}

export default function PaymentsTable({ pagedItems, filtered, openDetail }) {
  const t = useTranslations();
  const { locale } = useLocale();
  const localeCode = locale === "vn" ? "vi-VN" : "en-US";
  const date = new Intl.DateTimeFormat(localeCode, { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = new Intl.DateTimeFormat(localeCode, { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="overflow-x-auto border ui-border ui-panel">
      <table className="admin-payment-table w-full text-left text-[13px]">
        <colgroup>
          <col className="w-[20%]" /><col className="w-[16%]" /><col className="w-[11%]" /><col className="w-[15%]" />
          <col className="w-[14%]" /><col className="w-[13%]" /><col className="w-[11%]" />
        </colgroup>
        <thead className="bg-white/5 ui-muted">
          <tr>
            <th className="px-2">{t("payments.transactionBooking")}</th>
            <th className="px-2">{t("common.user")}</th>
            <th className="px-2">{t("common.provider")}</th>
            <th className="px-2">{t("common.amount")}</th>
            <th className="px-2">{t("common.status")}</th>
            <th className="px-2">{t("common.date")}</th>
            <th className="px-2 text-right">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {pagedItems.map((p) => (
            <tr key={p.id} className="border-t ui-border hover:bg-white/5">
              <td className="px-2">
                <CopyId value={p.id} prefix="#" />
                <div className="mt-1"><CopyId value={p.booking_id} prefix="↳ " /></div>
              </td>
              <td className="px-2">
                <div className="flex min-w-0 items-center gap-2">
                  <UserAvatar user={p.booking?.guest} />
                  <div className="min-w-0">
                    <div className="truncate font-medium" title={p.booking?.guest?.full_name || p.booking?.guest?.email}>{p.booking?.guest?.full_name || p.booking?.guest?.email || "—"}</div>
                    <div className="mt-0.5 truncate text-xs ui-muted" title={p.booking?.guest?.email}>{p.booking?.guest?.email || "—"}</div>
                  </div>
                </div>
              </td>
              <td className="px-2">
                {p.provider?.toLowerCase() === "vnpay" ? (
                  <Image src="/vnpay-logo.svg" alt="VNPAY" width={92} height={28} className="h-auto max-w-full" />
                ) : p.provider?.toLowerCase() === "stripe" ? (
                  <span className="inline-flex items-center justify-center rounded bg-[#635bff] px-1">
                    <Image src="/stripe-logo.svg" alt="Stripe" width={68} height={29} className="h-auto max-w-full" />
                  </span>
                ) : p.provider || "—"}
              </td>
              <td className="px-2 whitespace-nowrap font-medium">
                {new Intl.NumberFormat(locale === "vn" ? "vi-VN" : "en-US", { style: "currency", currency: p.currency || "VND" }).format(Number(p.amount || 0))}
              </td>
              <td className="px-2 capitalize">
                <Badge tone={getStatusColor(p.status)}>{t(`statuses.${p.status}`)}</Badge>
              </td>
              <td className="px-2 whitespace-nowrap">
                {p.created_at ? <><div>{date.format(new Date(p.created_at))}</div><div className="mt-0.5 text-xs ui-muted">{time.format(new Date(p.created_at))}</div></> : "—"}
              </td>
              <td className="px-2 text-right">
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openDetail(p)}
                  >
                    <Eye size={15} aria-hidden="true" />
                    {t("common.detail")}
                  </Button>
                </div>
              </td>
            </tr>
          ))}

          {!filtered.length ? (
            <tr>
              <td className="px-4 py-10 text-center ui-muted" colSpan={7}>
                {t("payments.empty")}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
