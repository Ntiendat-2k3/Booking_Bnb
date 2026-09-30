"use client";

import { forwardRef } from "react";
import clsx from "clsx";

const IconButton = forwardRef(function IconButton(
  { label, className, children, variant = "surface", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={clsx(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
        variant === "inverse" ? "border border-white/20 bg-white/10 text-white hover:bg-white/20" : variant === "brand"
          ? "bg-brand text-on-brand hover:bg-brand-dark"
          : "border border-line bg-surface text-ink hover:bg-muted-surface",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export default IconButton;
