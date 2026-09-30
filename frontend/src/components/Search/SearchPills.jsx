"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { CalendarBlank, MagnifyingGlass, MapPin, Users } from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { POPULAR_DESTINATIONS } from "@/lib/constants";
import Button from "@/components/atoms/Button";
import InputField from "@/components/atoms/InputField";
import DateField from "@/components/molecules/DateField";

/** Tìm chỗ ở theo địa điểm và số khách; khoảng ngày được giữ đến bước đặt phòng. */
export default function SearchPills() {
  const router = useRouter();
  const t = useTranslations();
  const suggestionId = useId();
  const [city, setCity] = useState("");
  const [dates, setDates] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("");

  function onSearch(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    const cityValue = city.trim();
    const destination = POPULAR_DESTINATIONS.find((item) =>
      t(item.labelKey).toLocaleLowerCase() === cityValue.toLocaleLowerCase(),
    );
    if (cityValue) params.set("city", destination?.value || cityValue);
    if (guests) params.set("guests", guests);
    if (dates) params.set("check_in", dates);
    if (dates && checkOut) params.set("check_out", checkOut);
    router.push("/search?" + params.toString());
  }

  return (
    <form onSubmit={onSearch} aria-label={t("common.search")} className="search-pills surface-panel grid items-center gap-1 p-2 shadow-float sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.8fr_auto] lg:p-3">
      <div className="search-destination search-field">
        <InputField variant="integrated" label={<span className="flex items-center gap-2"><MapPin aria-hidden size={18} className="text-brand" />{t("search.destination")}</span>}
          name="city" list={suggestionId} value={city} onChange={(event) => setCity(event.target.value)} placeholder={t("search.destinationPlaceholder")} autoComplete="off" />
        <datalist id={suggestionId}>
          {POPULAR_DESTINATIONS.map((destination) => <option key={destination.value} value={t(destination.labelKey)} />)}
        </datalist>
      </div>
      <div className="search-checkin search-field sm:border-l sm:border-line">
        <DateField variant="integrated" label={<span className="flex items-center gap-2"><CalendarBlank aria-hidden size={18} className="text-brand" />{t("search.checkIn")}</span>}
          name="check_in" minDate={new Date()} selected={dates ? parseISO(dates) : null} onChange={(date) => {
            const value = date ? format(date, "yyyy-MM-dd") : "";
            setDates(value);
            if (!value || checkOut <= value) setCheckOut("");
          }} placeholderText={t("search.datesPlaceholder")} title={t("search.dateHint")} />
      </div>
      <div className="search-checkout search-field lg:border-l lg:border-line">
        <DateField variant="integrated" label={<span className="flex items-center gap-2"><CalendarBlank aria-hidden size={18} className="text-brand" />{t("checkout.checkOut")}</span>}
          name="check_out" disabled={!dates} minDate={dates ? addDays(parseISO(dates), 1) : new Date()} selected={checkOut ? parseISO(checkOut) : null} onChange={(date) => setCheckOut(date ? format(date, "yyyy-MM-dd") : "")} placeholderText={t("search.datesPlaceholder")} />
      </div>
      <div className="search-guests search-field lg:border-l lg:border-line">
        <InputField variant="integrated" label={<span className="flex items-center gap-2"><Users aria-hidden size={18} className="text-brand" />{t("search.guests")}</span>}
          name="guests" type="number" min="1" step="1" value={guests} onChange={(event) => setGuests(event.target.value)} placeholder={t("search.guestsPlaceholder")} />
      </div>
      <Button type="submit" size="md" className="search-submit m-2 self-center lg:px-7" aria-label={t("common.search")}>
        <MagnifyingGlass aria-hidden size={21} weight="bold" /><span>{t("common.search")}</span>
      </Button>
    </form>
  );
}
