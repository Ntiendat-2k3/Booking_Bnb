import { Star } from "@phosphor-icons/react";

export function toInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function Stars({ value }) {
  const v = toInt(value, 0);
  return (
    <div className="flex items-center gap-1">
      <Star aria-hidden size={16} weight="fill" className="text-brand" />
      <span className="text-sm font-semibold text-ink">{v}</span>
    </div>
  );
}
