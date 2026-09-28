"use client";

import { forwardRef } from "react";
import clsx from "clsx";
import { CircleNotch } from "@phosphor-icons/react";

const variants = {
  primary:
    "bg-brand text-white shadow-sm hover:bg-brand-dark focus-visible:ring-brand/30",
  secondary:
    "border border-line bg-surface text-ink hover:bg-muted-surface focus-visible:ring-ink/20",
  ghost:
    "bg-transparent text-ink hover:bg-muted-surface focus-visible:ring-ink/20",
  danger:
    "bg-danger text-white hover:brightness-95 focus-visible:ring-danger/30",
};

const sizes = {
  sm: "min-h-11 px-4 py-2 text-sm",
  md: "min-h-11 px-5 py-2.5 text-sm",
  lg: "min-h-12 px-6 py-3 text-base",
};

const Button = forwardRef(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    children,
    type = "button",
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <CircleNotch aria-hidden size={18} className="animate-spin" />
      ) : null}
      {children}
    </button>
  );
});

export default Button;
