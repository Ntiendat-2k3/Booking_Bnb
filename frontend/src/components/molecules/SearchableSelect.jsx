"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import clsx from "clsx";
import InputField from "@/components/atoms/InputField";

const fold = (value) => value.toLocaleLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replaceAll("đ", "d");

/** Chọn một mục trong danh sách dài bằng tìm kiếm, chuột hoặc bàn phím. */
export default function SearchableSelect({ options, value, onChange, label, searchLabel,
  emptyLabel, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const search = fold(query.trim());
  const matches = options.filter((option) => fold(option.label).includes(search));

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function choose(nextValue) {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }

  return <div className={clsx("relative grid min-w-0 flex-1 gap-1 text-sm font-semibold text-ink sm:max-w-sm", className)}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }}>
    <span id={`${listId}-label`}>{label}</span>
    <button ref={triggerRef} type="button" aria-labelledby={`${listId}-label ${listId}-value`}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
      onClick={() => { setQuery(""); setOpen((current) => !current); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" && !open) { event.preventDefault(); setQuery(""); setOpen(true); }
      }}
      className="flex min-h-11 w-full items-center justify-between gap-2 rounded-control border border-line bg-muted-surface px-3 text-left text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      <span id={`${listId}-value`} className="truncate">{selected?.label || placeholder}</span>
      <CaretDown aria-hidden size={16} className="shrink-0" />
    </button>
    {open && <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-control border border-line bg-surface p-2 shadow-float">
      <InputField label={searchLabel} type="search" inputRef={inputRef}
        value={query} onChange={(event) => setQuery(event.target.value)}
        role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls={listId}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && matches.length) {
            event.preventDefault();
            document.getElementById(listId)?.querySelector('[role="option"]')?.focus();
          }
        }} />
      <div id={listId} role="listbox" aria-labelledby={`${listId}-label`}
        className="mt-2 max-h-60 space-y-1 overflow-y-auto">
        {matches.map((option) => <button key={option.value} type="button" role="option"
          aria-selected={option.value === value} onClick={() => choose(option.value)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            event.preventDefault();
            const items = [...event.currentTarget.parentElement.querySelectorAll('[role="option"]')];
            items[items.indexOf(event.currentTarget) + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
          }}
          className={`flex min-h-11 w-full items-center rounded-control px-3 py-2 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            option.value === value ? "bg-brand/15 text-ink" : "text-ink hover:bg-muted-surface"
          }`}>{option.label}</button>)}
        {!matches.length && <p role="status" className="px-3 py-2 text-sm font-normal text-muted-ink">{emptyLabel}</p>}
      </div>
    </div>}
  </div>;
}
