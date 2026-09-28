"use client";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { Heart } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api";
import ListingCard from "@/components/ListingCard";
import ListingCardSkeleton from "@/components/ListingCardSkeleton";
import EmptyState from "@/components/molecules/EmptyState";
import Button from "@/components/atoms/Button";
import { useTranslations } from "@/i18n/LocaleProvider";
import Link from "next/link";

export default function FavoritesPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user, isInitialized } = useSelector((s) => s.auth);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const userId = user?.id;
  useEffect(() => {
    if (!isInitialized) return;
    if (!userId) { router.replace("/login"); return; }
    let active = true;
    apiFetch("/api/v1/favorites", { method: "GET" })
      .then((res) => { if (active) { setItems(res.data || []); setError(false); } })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, isInitialized, router, attempt]);
  return <div className="space-y-6">
    <div><h1 className="text-3xl font-bold tracking-tight text-ink">{t("favorites.title")}</h1><p className="mt-2 text-muted-ink">{t("favorites.description")}</p></div>
    {loading || !isInitialized ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <ListingCardSkeleton key={index} />)}</div> :
      error ? <EmptyState title={t("favorites.loadFailed")} action={<Button onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>{t("common.retry")}</Button>} /> :
      items.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div> :
      <EmptyState icon={<Heart aria-hidden size={30} />} title={t("favorites.emptyTitle")} description={t("favorites.emptyDescription")} action={<Link href="/" className="inline-flex min-h-11 items-center rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">{t("favorites.explore")}</Link>} />}
  </div>;
}
