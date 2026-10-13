"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const styles = {
  base:
    "inline-flex items-center justify-center gap-2 border text-sm font-semibold transition-colors disabled:opacity-60 disabled:pointer-events-none",
  variants: {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    outline: "btn-outline",
    danger: "btn-danger",
    success: "btn-success",
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
