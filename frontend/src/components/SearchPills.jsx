"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SearchIcon } from "./icons";

export default function SearchPills() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [dates, setDates] = useState("");
  const [guests, setGuests] = useState("");

  const placeholder = useMemo(() => ({
    city: "Địa điểm bất kỳ",
    dates: "Thời gian bất kỳ",
    guests: "Thêm khách",
  }), []);

  function onSearch() {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (guests) params.set("guests", guests);
    router.push("/search?" + params.toString());
  }

  return (
    <div className="hidden md:flex items-center rounded-full border bg-white shadow-sm">
      <button type="button" className="px-5 py-2 text-sm font-medium" onClick={() => {}}>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={placeholder.city}
          className="w-36 bg-transparent outline-none placeholder:text-slate-600"
        />
      </button>
      <div className="h-6 w-px bg-slate-200" />
      <button type="button" className="px-5 py-2 text-sm font-medium" onClick={() => {}}>
        <input
          value={dates}
          onChange={(e) => setDates(e.target.value)}
          placeholder={placeholder.dates}
          className="w-32 bg-transparent outline-none placeholder:text-slate-600"
        />
      </button>
      <div className="h-6 w-px bg-slate-200" />
      <button type="button" className="px-5 py-2 text-sm text-slate-600" onClick={() => {}}>
        <input
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          placeholder={placeholder.guests}
          className="w-24 bg-transparent outline-none placeholder:text-slate-600"
        />
      </button>
      <button
        type="button"
        onClick={onSearch}
        className="m-2 flex items-center justify-center rounded-full bg-brand p-2 text-white hover:bg-brand-dark"
        aria-label="Tìm kiếm"
      >
        <SearchIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
