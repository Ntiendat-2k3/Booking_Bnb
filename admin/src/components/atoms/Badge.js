"use client";

import { cn } from "@/lib/cn";

export default function Badge({ children, tone = "zinc", className }) {
  const tones = ["zinc", "pink", "emerald", "amber", "rose", "slate"];

  return (
    <span
      className={cn(
        "admin-badge inline-flex items-center px-2.5 py-1",
        `admin-badge-${tones.includes(tone) ? tone : "zinc"}`,
        className
      )}
    >
      {children}
    </span>
  );
}
