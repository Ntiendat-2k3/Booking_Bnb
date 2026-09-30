"use client";

import { lazy, Suspense, useId, useState } from "react";
import { format } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import InputField from "@/components/atoms/InputField";
import { useLocale } from "@/i18n/LocaleProvider";

const DatePicker = lazy(() => Promise.all([
  import("react-datepicker"),
  import("react-datepicker/dist/react-datepicker.css"),
  import("./DateField.css"),
]).then(([picker]) => picker));

/** Dùng chung lịch ngày/khoảng ngày; chỉ tải lịch khi mở và giữ nguyên ô nhập trong lúc chờ. */
export default function DateField({
  id, label, variant, className, hint, placeholderText,
  selected, startDate, endDate, selectsRange = false, dateFormat = "dd/MM/yyyy", ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const { locale } = useLocale();
  const [ready, setReady] = useState(false);
  const dates = selectsRange ? [startDate, endDate] : [selected];
  const input = <InputField
    id={inputId}
    label={label}
    variant={variant}
    className={className}
    hint={hint}
    name={props.name}
    title={props.title}
    disabled={props.disabled}
    placeholder={placeholderText}
    value={dates.filter(Boolean).map((date) => format(date, dateFormat)).join(" – ")}
    readOnly
    onFocus={() => setReady(true)}
    onClick={() => setReady(true)}
  />;

  if (!ready) return input;

  return <Suspense fallback={input}>
    <DatePicker
      {...props}
      id={inputId}
      selected={selected}
      startDate={startDate}
      endDate={endDate}
      selectsRange={selectsRange}
      placeholderText={placeholderText}
      dateFormat={dateFormat}
      rangeSeparator=" – "
      locale={locale === "en" ? enUS : vi}
      monthsShown={1}
      calendarClassName="booking-calendar"
      popperClassName="booking-calendar-popper"
      showPopperArrow={false}
      // Chỉ xét viewport sau khi người dùng mở lịch, giữ HTML ban đầu nhất quán với SSR.
      withPortal={typeof window !== "undefined" && window.matchMedia("(width < 768px)").matches}
      portalId="booking-calendar-root"
      customInput={input}
      customInputRef="inputRef"
      autoFocus
      startOpen
    />
  </Suspense>;
}
