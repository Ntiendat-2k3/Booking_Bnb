"use client";

import { forwardRef } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CircleNotch } from "@phosphor-icons/react";

const variants = {
  primary:
    "bg-brand text-on-brand shadow-sm hover:bg-brand-dark hover:shadow-soft focus-visible:ring-brand/30",
  secondary:
    "border border-line bg-surface text-ink hover:bg-muted-surface focus-visible:ring-ink/20",
  ghost:
    "bg-transparent text-ink hover:bg-muted-surface focus-visible:ring-ink/20",
  danger:
    "bg-danger text-on-danger hover:brightness-95 focus-visible:ring-danger/30",
  ink:
    "bg-ink text-on-ink hover:bg-ink/90 focus-visible:ring-ink/20",
};

const sizes = {
  sm: "min-h-11 px-4 py-2 text-sm",
  md: "min-h-12 px-5 py-3 text-sm",
  lg: "min-h-14 px-6 py-4 text-base",
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
    href,
    onClick,
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  const buttonClassName = clsx(
    "inline-flex items-center justify-center gap-2 rounded-control font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 motion-reduce:transition-none",
    variants[variant],
    sizes[size],
    className,
  );
  const content = (
    <>
      {loading ? (
        <CircleNotch aria-hidden size={18} className="animate-spin" />
      ) : null}
      {children}
    </>
  );

  // Liên kết và hành động dùng cùng một hệ thống nút, giữ đúng ngữ nghĩa HTML.
  if (href) {
    return (
      <Link
        ref={ref}
        href={href}
        {...props}
        className={buttonClassName}
        aria-disabled={isDisabled || undefined}
        tabIndex={isDisabled ? -1 : props.tabIndex}
        onClick={(event) => {
          if (isDisabled) { event.preventDefault(); return; }
          onClick?.(event);
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <button ref={ref} type={type} disabled={isDisabled} className={buttonClassName} onClick={onClick} {...props}>
      {content}
    </button>
  );
});

export default Button;
