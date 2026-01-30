"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-xl border ui-input px-3 text-sm outline-none transition focus-ring",
        className
      )}
      {...props}
    />
  );
});

export default Input;
