"use client";
import { useEffect, useState } from "react";
import { Shield } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";

export default function PrivacySettings({ user }) {
  const t = useTranslations();
  const [settings, setSettings] = useState(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    apiFetch("/api/v1/users/me/settings", { method: "GET" })
      .then((res) => { if (active) { setSettings(res.data); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [userId, attempt]);
  async function saveSettings(patch) {
    setSaving(true);
    try {
      const res = await apiFetch("/api/v1/users/me/settings", { method: "PATCH", body: { ...settings, ...patch } });
      setSettings(res.data); notifySuccess(t("privacy.updated"));
    } catch (error) { notifyError(error?.message || t("privacy.updateFailed")); }
    finally { setSaving(false); }
  }
  if (failed) return <div role="alert" className="p-6"><p>{t("privacy.loadFailed")}</p><Button className="mt-4" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>{t("common.retry")}</Button></div>;
  if (!settings) return <p role="status" className="p-6 text-muted-ink">{t("privacy.loading")}</p>;
  const items = [{ id: "show_profile", label: "privacy.showProfile", description: "privacy.profileDescription" }, { id: "show_reviews", label: "privacy.showReviews", description: "privacy.reviewsDescription" }, { id: "marketing_emails", label: "privacy.marketing", description: "privacy.marketingDescription" }];
  return <section className="surface-panel p-5 sm:p-8">
    <h2 className="flex items-center gap-2 text-xl font-bold"><Shield aria-hidden size={24} className="text-brand" />{t("privacy.title")}</h2><p className="mt-2 text-sm text-muted-ink">{t("privacy.description")}</p>
    <div className="mt-6 space-y-6">{items.map((item) => <label key={item.id} className="flex min-h-11 cursor-pointer items-start justify-between gap-4">
      <span className="min-w-0"><span className="block font-semibold">{t(item.label)}</span><span className="mt-1 block text-sm leading-6 text-muted-ink">{t(item.description)}</span></span>
      <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-brand" aria-label={t(item.label)} checked={settings[item.id] !== false} disabled={saving} onChange={(e) => saveSettings({ [item.id]: e.target.checked })} />
    </label>)}</div>
  </section>;
}
