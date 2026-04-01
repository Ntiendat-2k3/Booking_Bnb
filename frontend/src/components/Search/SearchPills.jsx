"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SearchIcon } from "@/components/icons";

export default function SearchPills() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [dates, setDates] = useState("");
  const [guests, setGuests] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Danh sách các thành phố phổ biến ở Việt Nam
  const POPULAR_CITIES = useMemo(() => [
    "Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Đà Lạt", "Vũng Tàu", 
    "Nha Trang", "Sapa", "Hội An", "Phú Quốc", "Ninh Bình", 
    "Vịnh Hạ Long", "Quy Nhơn", "Cần Thơ", "Huế"
  ], []);

  const filteredCities = useMemo(() => {
    if (!city) return POPULAR_CITIES;
    const lower = city.toLowerCase();
    return POPULAR_CITIES.filter((c) => c.toLowerCase().includes(lower));
  }, [city, POPULAR_CITIES]);

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
    <div className="hidden md:flex items-center rounded-full border bg-white shadow-sm hover:shadow transition relative z-40">
      <div className="relative px-5 py-2 flex-1">
        <label className="text-xs font-bold text-slate-800 block -mb-0.5">Địa điểm</label>
        <input
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setShowAutocomplete(true);
          }}
          onFocus={() => setShowAutocomplete(true)}
          onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
          placeholder={placeholder.city}
          className="w-36 bg-transparent outline-none placeholder:text-slate-500 text-sm overflow-ellipsis"
        />
        {/* Autocomplete Dropdown */}
        {showAutocomplete && (
          <div className="absolute top-16 left-0 w-80 max-h-80 overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-2xl z-50 py-4 px-2">
            <div className="px-4 text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
              {filteredCities.length > 0 ? "Gợi ý địa điểm" : "Không tìm thấy"}
            </div>
            {filteredCities.map((c) => (
              <div
                key={c}
                onMouseDown={(e) => {
                  e.preventDefault(); // Ngăn input bị mất focus (tránh gọi onBlur trước)
                  setCity(c);
                  setShowAutocomplete(false);
                }}
                className="px-4 py-3 flex items-center gap-4 hover:bg-slate-100 rounded-xl cursor-pointer transition"
              >
                <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="font-medium text-slate-700">{c}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-8 w-px bg-slate-200" />
      
      <div className="px-5 py-2 flex-1">
        <label className="text-xs font-bold text-slate-800 block -mb-0.5">Nhận phòng</label>
        <input
          value={dates}
          onChange={(e) => setDates(e.target.value)}
          placeholder={placeholder.dates}
          className="w-32 bg-transparent outline-none placeholder:text-slate-500 text-sm"
        />
      </div>

      <div className="h-8 w-px bg-slate-200" />

      <div className="px-5 py-2 flex-1 relative">
         <label className="text-xs font-bold text-slate-800 block -mb-0.5">Khách</label>
        <input
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          placeholder={placeholder.guests}
          className="w-24 bg-transparent outline-none placeholder:text-slate-500 text-sm"
        />
      </div>
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
