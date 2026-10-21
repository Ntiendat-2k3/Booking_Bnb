"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Bell } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";

const categories = ["messages", "bookings", "calls", "reminders", "offers"];

/** API là nguồn chuẩn; localStorage cũ chỉ được đọc một lần khi tài khoản chưa có tùy chọn trên server. */
export default function NotificationSettings() {
  const t = useTranslations();
  const userId = useSelector((state) => state.auth.user?.id);
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    async function load() {
      try {
        let data = (await apiFetch("/api/v1/notifications/preferences")).data;
        if (!active) return;
        if (!data.configured) {
          const key = `booking_notification_preferences:${userId}`;
          let previous = null;
          try { previous = JSON.parse(localStorage.getItem(key) || "null"); } catch {}
          if (previous && typeof previous === "object") {
            const changes = Object.fromEntries(categories.filter((category) =>
              typeof previous[category] === "boolean").map((category) => [category, previous[category]]));
            if (Object.keys(changes).length) {
              data = (await apiFetch("/api/v1/notifications/preferences", {
                method: "PUT", body: changes,
              })).data;
              try { localStorage.removeItem(key); } catch {}
            }
          }
        }
        if (active) { setSaved(data); setDraft(null); setError(false); }
      } catch { if (active) setError(true); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [userId, revision]);

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const result = (await apiFetch("/api/v1/notifications/preferences", {
        method: "PUT", body: Object.fromEntries(categories.map((category) => [category, Boolean(draft[category])])),
      })).data;
      setSaved(result); setDraft(null); setError(false);
      notifySuccess(t("notificationSettings.saved"));
    } catch { notifyError(t("common.saveFailed")); }
    finally { setSaving(false); }
  };
  const preferences = draft || saved;
  return <section className="surface-panel p-5 sm:p-8">
    <h2 className="flex items-center gap-2 text-xl font-bold"><Bell aria-hidden size={24} className="text-brand" />{t("notificationSettings.title")}</h2>
    <p className="mt-2 text-sm text-muted-ink">{t("notificationSettings.description")}</p>
    <p className="mt-2 text-xs text-muted-ink">{t("notificationSettings.localNote")}</p>
    {loading && <p role="status" className="mt-5 text-sm text-muted-ink">{t("common.loading")}</p>}
    {error && <p role="alert" className="mt-5 text-sm text-danger">{t("common.loadFailed")}
      <button type="button" onClick={() => setRevision((current) => current + 1)} className="ml-2 underline">{t("common.retry")}</button></p>}
    {preferences && <div className="mt-6 space-y-6">{categories.map((category) =>
      <label key={category} className="flex min-h-11 cursor-pointer items-start justify-between gap-4">
        <span className="min-w-0"><span className="block font-semibold">{t(`notificationSettings.${category}`)}</span>
          <span className="mt-1 block text-sm leading-6 text-muted-ink">{t(`notificationSettings.${category}Description`)}</span></span>
        <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-brand" aria-label={t(`notificationSettings.${category}`)}
          checked={Boolean(preferences[category])}
          onChange={(event) => setDraft({ ...preferences, [category]: event.target.checked })} />
      </label>)}</div>}
    <Button className="mt-6" onClick={save} disabled={!draft || saving}>{t("profile.save")}</Button>
  </section>;
}
