"use client";

import Link from "next/link";
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
        <div className="rounded-2xl border bg-surface p-6">
          <h1 className="text-xl font-semibold">{t("host.listingsTitle")}</h1>
          <p className="mt-2 text-muted-ink">{t("host.loginPrompt")}</p>
          <div className="mt-4 flex gap-3">
            <Link href="/login" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">{t("auth.loginTitle")}</Link>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== "host" && user.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border bg-surface p-6">
          <h1 className="text-xl font-semibold">{t("host.notHost")}</h1>
          <p className="mt-2 text-muted-ink">{t("host.upgradeDescription")}</p>
          <div className="mt-4">
            <Link href="/host" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">{t("host.become")}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("host.listingsTitle")}</h1>
          <p className="text-muted-ink">
            {t("host.listingsDescription")}
          </p>
        </div>

        <Link href="/host/listings/new" className="inline-flex w-fit rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">{t("host.newListing")}</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => { if (tab !== item.key) { setLoading(true); setTab(item.key); } }} disabled={loading} aria-pressed={tab === item.key}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${tab === item.key ? "bg-slate-900 text-white" : "bg-surface hover:bg-muted-surface"}`}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-surface p-6 text-muted-ink">{t("common.loading")}</div>
      ) : loadError ? (<div role="alert" className="rounded-2xl border border-line bg-surface p-6"><p>{t("host.loadFailed")}</p><button className="mt-3 min-h-11 rounded-xl border px-4" onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>{t("common.retry")}</button></div>) : filtered.length ? (
        <div className="grid gap-3">
          {filtered.map((x) => (
            <div key={x.id} className="flex flex-col gap-3 rounded-2xl border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-24 overflow-hidden rounded-xl bg-muted-surface">
                  <Image
                    src={x.cover_url || "https://picsum.photos/seed/cover/400/300"}
                    alt={x.title || t("images.cover")}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{x.title}</div>
                    <Badge tone={x.status === "published" ? "success" : x.status === "pending" ? "warning" : x.status === "rejected" ? "danger" : "neutral"}>{t(`host.${x.status}`)}</Badge>
                  </div>
                  <div className="text-sm text-muted-ink">
                    {x.city}, {x.country} • {formatVND(x.price_per_night, locale === "en" ? "en-US" : "vi-VN")} {t("listing.perNight")} · {t("checkout.guestCount", { count: x.max_guests })}
                  </div>
                  <div className="mt-1 text-xs text-muted-ink">
                    {t("common.identifier")} <span className="font-mono">{x.id}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={`/host/listings/${x.id}`} className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-muted-surface">{t("host.manage")}</Link>
                {x.status === "published" ? (
                  <Link href={`/rooms/${x.id}`} className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-muted-surface">{t("host.viewPublic")}</Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-surface p-6 text-muted-ink">{t("host.empty")}</div>
      )}
    </div>
  );
}