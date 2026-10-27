"use client";

import { formatVND } from "@/lib/format";
import { useLocale } from "@/i18n/LocaleProvider";

/** Cùng một cấu trúc giá từ server được hiển thị ở trang phòng và Checkout. */
export default function PriceBreakdown({ quote }) {
  const { locale, t } = useLocale();
  const money = (value) => formatVND(value, locale === "en" ? "en-US" : "vi-VN");
  if (!quote?.nights?.length) return null;

  return (
    <div className="space-y-3 text-sm text-ink">
      <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
        {quote.nights.map((night) => (
          <div key={night.date} className="flex justify-between gap-3">
            <span>{night.date.slice(8, 10)}/{night.date.slice(5, 7)}/{night.date.slice(0, 4)}</span>
            <span className="font-medium">{money(night.price_per_night)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between gap-3 border-t border-line pt-3"><span>{t("pricing.subtotal")}</span><span>{money(quote.subtotal)}</span></div>
      <div className="flex justify-between gap-3"><span>{t("pricing.fees")}</span><span>{money(quote.fees || 0)}</span></div>
      <div className="flex justify-between gap-3"><span>{t("pricing.discount")}</span><span>-{money(quote.discount || 0)}</span></div>
      <div className="flex justify-between gap-3 border-t border-line pt-3 font-bold"><span>{t("pricing.total")}</span><span>{money(quote.total)}</span></div>
    </div>
  );
}
