"use client";

import clsx from "clsx";
import { useId } from "react";

export default function InputField({
  label,
  error,
  hint,
  className,
  inputClassName,
  suffix,
  id,
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
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className={clsx(
          "min-h-11 w-full rounded-xl border bg-surface px-3.5 py-2.5 text-base text-ink outline-none transition placeholder:text-muted-ink/70 focus:border-ink focus:ring-4 focus:ring-ink/10 disabled:cursor-not-allowed disabled:bg-muted-surface disabled:text-muted-ink motion-reduce:transition-none",
          error ? "border-danger focus:border-danger focus:ring-danger/10" : "border-line",
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
