"use client";

import Button from "@/components/atoms/Button";
import Badge from "@/components/atoms/Badge";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { apiFetch } from "@/lib/api";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatVND } from "@/lib/format";
import { useLocale } from "@/i18n/LocaleProvider";

const STATUS_TABS = [
  { key: "all", labelKey: "search.allCategories" },
  { key: "draft", labelKey: "host.draft" },
  { key: "pending", labelKey: "host.pending" },
  { key: "published", labelKey: "host.published" },
  { key: "paused", labelKey: "host.paused" },
  { key: "rejected", labelKey: "host.rejected" },
];


export default function HostListingsPage() {
  const { locale, t } = useLocale();
  const router = useRouter();

  const user = useSelector((s) => s.auth.user);
  const isInitialized = useSelector((s) => s.auth.isInitialized);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    if (tab === "all") return items;
    return items.filter((x) => x.status === tab);
  }, [items, tab]);

  const userId = user?.id;
  const canManage = user?.role === "host" || user?.role === "admin";
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!isInitialized || !userId || !canManage) return;
    let active = true;
    apiFetch(`/api/v1/host/listings${tab !== "all" ? `?status=${encodeURIComponent(tab)}` : ""}`, { method: "GET" })
      .then((res) => { if (active) { setItems(res.data?.items || []); setLoadError(false); } })
      .catch((error) => { if (!active) return; if (error.status === 403) router.replace("/host"); else if (error.status === 401) router.replace("/login"); else setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tab, isInitialized, userId, canManage, router, attempt]);

  if (!isInitialized) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="surface-panel p-6">
          <h1 className="page-heading">{t("host.listingsTitle")}</h1>
          <p className="mt-2 text-muted-ink">{t("host.loginPrompt")}</p>
          <div className="mt-4 flex gap-3">
            <Button href="/login">{t("auth.loginTitle")}</Button>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== "host" && user.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="surface-panel p-6">
          <h1 className="page-heading">{t("host.notHost")}</h1>
          <p className="mt-2 text-muted-ink">{t("host.upgradeDescription")}</p>
          <div className="mt-4">
            <Button href="/host">{t("host.become")}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-heading">{t("host.listingsTitle")}</h1>
          <p className="mt-2 text-muted-ink">
            {t("host.listingsDescription")}
          </p>
        </div>

        <Button href="/host/listings/new" className="w-fit">{t("host.newListing")}</Button>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
        {STATUS_TABS.map((item) => (
          <Button
            key={item.key}
            onClick={() => { if (tab !== item.key) { setLoading(true); setTab(item.key); } }} disabled={loading} aria-pressed={tab === item.key}
            variant={tab === item.key ? "ink" : "secondary"} size="sm" className="shrink-0"
          >
            {t(item.labelKey)}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="surface-panel p-6 text-muted-ink">{t("common.loading")}</div>
      ) : loadError ? (<div role="alert" className="surface-panel p-6"><p>{t("host.loadFailed")}</p><Button variant="secondary" className="mt-3" onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>{t("common.retry")}</Button></div>) : filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((x) => (
            <article key={x.id} className="surface-panel flex flex-col gap-4 p-3">
              <div className="flex flex-col gap-4">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-control bg-muted-surface">
                  <Image
                    src={x.cover_url || "/placeholder-room.svg"}
                    alt={x.title || t("images.cover")}
                    fill
                    sizes="(max-width: 768px) 90vw, (max-width: 1280px) 45vw, 420px"
                    className="object-cover"
                  />
                </div>
                <div className="px-2">
                  <div className="flex flex-wrap items-start gap-2">
                    <h2 className="w-full text-xl font-bold tracking-tight">{x.title}</h2>
                    <Badge tone={x.status === "published" ? "success" : x.status === "pending" ? "warning" : x.status === "rejected" ? "danger" : "neutral"}>{t(`host.${x.status}`)}</Badge>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-muted-ink">
                    {x.city}, {x.country} • {formatVND(x.price_per_night, locale === "en" ? "en-US" : "vi-VN")} {t("listing.perNight")} · {t("checkout.guestCount", { count: x.max_guests })}
                  </div>
                  <div className="mt-1 text-xs text-muted-ink">
                    {t("common.identifier")} <span className="font-mono">{x.id}</span>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-line px-2 pt-4">
                <Button href={`/host/listings/${x.id}`} variant="ink" size="sm">{t("host.manage")}</Button>
                {x.status === "published" ? (
                  <Button href={`/rooms/${x.id}`} variant="secondary" size="sm">{t("host.viewPublic")}</Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="surface-panel p-6 text-muted-ink">{t("host.empty")}</div>
      )}
    </div>
  );
}
