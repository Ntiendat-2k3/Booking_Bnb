"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-xl border border-(--ui-border) bg-(--ui-panel-2) px-3 text-sm text-(--foreground) outline-none transition placeholder:text-(--ui-muted-2) focus:ring-2 focus:ring-(--ui-ring)",
        className
      )}
      {...props}
    />
  );
});

export default Input;
