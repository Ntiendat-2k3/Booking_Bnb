"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border ui-input px-3 py-2 text-sm outline-none transition focus-ring",
        className
      )}
      {...props}
    />
  );
});

export default Textarea;
