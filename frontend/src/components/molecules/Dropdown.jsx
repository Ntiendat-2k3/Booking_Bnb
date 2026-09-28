"use client";

import { useEffect, useId, useRef, useState } from "react";

export default function Dropdown({
  button,
  label,
  children,
  align = "right",
  widthClass = "w-64",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (open) rootRef.current?.querySelector('[role="menuitem"]')?.focus();
  }, [open]);

  useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (!open) return;
      if (e.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector("button")?.focus();
      }
      if (e.key === "Tab") setOpen(false);
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        const items = Array.from(rootRef.current?.querySelectorAll('[role="menuitem"]') || []);
        if (!items.length) return;
        const current = items.indexOf(document.activeElement);
        const index = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (current + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[index]?.focus();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const side = align === "left" ? "left-0" : "right-0";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ink/20"
      >
        {button}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={
            "absolute " +
            side +
            " mt-2 " +
            widthClass +
            " z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-float"
          }
        >
          {children({ close: () => setOpen(false) })}
        </div>
      ) : null}
    </div>
  );
}
