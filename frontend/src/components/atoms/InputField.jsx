"use client";

import clsx from "clsx";
import { useId } from "react";

export default function InputField({
  label,
  error,
  hint,
  className,
  inputClassName,
  prefix,
  suffix,
  id,
  inputRef,
  variant = "default",
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const messageId = `${inputId}-message`;

  return (
    <div className={clsx("space-y-2", className)}>
      <label htmlFor={inputId} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        {prefix ? <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-ink" aria-hidden>{prefix}</div> : null}
        <input
          ref={inputRef}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? messageId : undefined}
          className={clsx(
            variant === "integrated" ? "field-integrated" : "field-control",
            "motion-reduce:transition-none",
            error ? "border-danger focus:border-danger focus:ring-danger/10" : "border-line",
            prefix && "pl-12",
            inputClassName,
          )}
          {...props}
        />
        {suffix ? <div className="absolute right-1 top-1/2 -translate-y-1/2">{suffix}</div> : null}
      </div>
      {error || hint ? (
        <p
          id={messageId}
          role={error ? "alert" : undefined}
          className={clsx(
            "text-sm",
            error ? "text-danger" : "text-muted-ink",
          )}
        >
          {error || hint}
        </p>
      ) : null}
    </div>
  );
}
