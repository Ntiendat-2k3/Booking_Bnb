"use client";

import { cn } from "@/lib/cn";

export default function Badge({ children, tone = "zinc", className }) {
  // Dark UI: use slightly stronger tints so badges are actually distinguishable
  const tones = {
    zinc: "border border-slate-400/35 bg-slate-400/15 text-slate-100",
    emerald: "border border-emerald-400/55 bg-emerald-400/25 text-emerald-50",
    amber: "border border-amber-400/55 bg-amber-400/25 text-amber-50",
    rose: "border border-rose-400/55 bg-rose-400/25 text-rose-50",
    slate: "border border-sky-400/45 bg-sky-400/20 text-sky-50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone] || tones.zinc,
        className
      )}
    >
      {children}
    </span>
  );
}
