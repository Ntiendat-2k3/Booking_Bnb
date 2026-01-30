"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const styles = {
  base:
    "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ui-ring) disabled:opacity-60 disabled:pointer-events-none",
  variants: {
    primary: "bg-(--ui-primary) text-white hover:bg-(--ui-primary-2)",
    // Slightly brighter secondary/ghost so it doesn't look "dead" on dark
    secondary:
      "bg-white/8 border border-(--ui-border) hover:bg-white/12 text-(--foreground)",
    ghost: "bg-transparent hover:bg-white/8 text-(--foreground)",
    outline: "border border-(--ui-border) bg-transparent hover:bg-white/8 text-(--foreground)",
    danger: "border border-rose-400/55 bg-rose-400/20 text-rose-50 hover:bg-rose-400/30",
    success: "border border-emerald-400/55 bg-emerald-400/20 text-emerald-50 hover:bg-emerald-400/30",
  },
  sizes: {
    sm: "h-9 px-3",
    md: "h-10 px-4",
    lg: "h-11 px-5",
  },
};

const Button = forwardRef(function Button(
  { className, variant = "secondary", size = "md", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(styles.base, styles.variants[variant], styles.sizes[size], className)}
      {...props}
    />
  );
});

export default Button;
