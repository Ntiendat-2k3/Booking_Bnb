"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const Select = forwardRef(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 rounded-xl border ui-input px-3 text-sm outline-none transition focus-ring",
        className
      )}
      {...props}
    />
  );
});

export default Select;
