import { StarIcon } from "@/components/icons";

export function toInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function Stars({ value }) {
  const v = toInt(value, 0);
  return (
    <div className="flex items-center gap-1">
      <StarIcon className="h-4 w-4 text-slate-900" />
      <span className="text-sm font-semibold">{v}</span>
    </div>
  );
}
