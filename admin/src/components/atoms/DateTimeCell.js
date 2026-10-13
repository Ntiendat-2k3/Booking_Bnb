export default function DateTimeCell({ value, locale = "vn" }) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const localeCode = locale === "vn" ? "vi-VN" : "en-US";
  const dateText = new Intl.DateTimeFormat(localeCode, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const timeText = new Intl.DateTimeFormat(localeCode, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return (
    <div className="whitespace-nowrap">
      <div>{dateText}</div>
      <div className="mt-0.5 text-xs ui-muted">{timeText}</div>
    </div>
  );
}
