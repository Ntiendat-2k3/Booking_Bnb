"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Bed,
  BuildingApartment,
  Buildings,
  DoorOpen,
  House,
  HouseLine,
  Warehouse,
} from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";
import Container from "./layout/Container";
import { CATEGORIES } from "@/lib/constants";

const CATEGORY_ICONS = {
  Bed,
  BuildingApartment,
  Buildings,
  DoorOpen,
  House,
  HouseLine,
  Warehouse,
};

function Chip({ active, children, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 " +
        (active
          ? "border-brand text-ink"
          : "border-transparent text-muted-ink hover:border-line hover:text-ink")
      }
    >
      {Icon ? <Icon aria-hidden size={20} weight={active ? "fill" : "regular"} /> : null}
      {children}
    </button>
  );
}

export default function CategoryTabs() {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const t = useTranslations();

  if (pathname !== "/" && pathname !== "/search") {
    return null;
  }

  const current = params.get("property_type") || "";

  function go(value) {
    const q = new URLSearchParams(params.toString());
    if (value) q.set("property_type", value);
    else q.delete("property_type");
    q.delete("page");
    router.push("/search?" + q.toString());
  }

  return (
    <div className="border-b border-line bg-surface">
      <Container>
        <nav
          aria-label={t("search.allCategories")}
          className="flex gap-4 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <Chip active={!current} onClick={() => go("")}>
            {t("search.allCategories")}
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.key}
              active={current === c.key}
              icon={CATEGORY_ICONS[c.icon]}
              onClick={() => go(c.key)}
            >
              {t(c.labelKey)}
            </Chip>
          ))}
        </nav>
      </Container>
    </div>
  );
}
