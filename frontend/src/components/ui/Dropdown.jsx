"use client";

import { useEffect, useId, useRef, useState } from "react";

export default function Dropdown({
  button,
  children,
  align = "right", // right|left
  widthClass = "w-64",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
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
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="outline-none"
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
            " overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          }
        >
          {children({ close: () => setOpen(false) })}
        </div>
      ) : null}
    </div>
  );
}
