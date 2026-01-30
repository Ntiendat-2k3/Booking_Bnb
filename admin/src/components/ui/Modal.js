"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import Button from "@/components/ui/Button";
import { X } from "lucide-react";

const sizeMap = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e) {
      if (e.key === "Escape" && dismissible) onClose?.();
    }

    window.addEventListener("keydown", onKeyDown);
    // focus panel
    setTimeout(() => panelRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onMouseDown={() => {
          if (dismissible) onClose?.();
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descId : undefined}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            "w-full rounded-2xl border border-(--ui-border) bg-(--ui-panel) text-(--foreground) shadow-2xl outline-none",
            sizeMap[size] || sizeMap.md
          )}
        >
          {(title || dismissible) ? (
            <div className="flex items-start justify-between gap-4 border-b border-(--ui-border) p-5">
              <div>
                {title ? (
                  <div id={titleId} className="text-base font-semibold text-(--foreground)">
                    {title}
                  </div>
                ) : null}
                {description ? (
                  <div id={descId} className="mt-1 text-sm text-(--ui-muted)">
                    {description}
                  </div>
                ) : null}
              </div>
              {dismissible ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-9 w-9 p-0 rounded-xl"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="max-h-[70vh] overflow-auto p-5">{children}</div>

          {footer ? (
            <div className="flex flex-col-reverse gap-2 border-t border-(--ui-border) p-5 sm:flex-row sm:items-center sm:justify-end">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
