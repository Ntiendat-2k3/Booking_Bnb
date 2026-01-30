"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-(--ui-border) bg-(--ui-panel-2) px-3 py-2 text-sm text-(--foreground) outline-none transition placeholder:text-(--ui-muted-2) focus:ring-2 focus:ring-(--ui-ring)",
        className
      )}
      {...props}
    />
  );
});

export default Textarea;
