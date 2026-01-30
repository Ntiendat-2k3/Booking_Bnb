"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const Select = forwardRef(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 rounded-xl border border-(--ui-border) bg-(--ui-panel-2) px-3 text-sm text-(--foreground) outline-none transition focus:ring-2 focus:ring-(--ui-ring)",
        className
      )}
      {...props}
    />
  );
});

export default Select;
