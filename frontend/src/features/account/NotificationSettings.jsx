"use client";
import { useState, useSyncExternalStore } from "react";
import { useSelector } from "react-redux";
import { Bell } from "@phosphor-icons/react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
const defaults = { messages: true, reminders: true, offers: true };
function subscribe(listener) {
  window.addEventListener("storage", listener); window.addEventListener("booking-preferences", listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener("booking-preferences", listener); };
}
/** Lưu lựa chọn theo tài khoản trên trình duyệt, vì API hiện có chưa có trường cho ba nhóm thông báo này. */
export default function NotificationSettings() {
  const t = useTranslations();
  const userId = useSelector((state) => state.auth.user?.id);
  const storageKey = "booking_notification_preferences:" + userId;
  const snapshot = useSyncExternalStore(subscribe, () => { try { return localStorage.getItem(storageKey); } catch { return null; } }, () => null);
  const [draft, setDraft] = useState(null);
  let saved = defaults;
  try { saved = { ...defaults, ...JSON.parse(snapshot || "{}") }; } catch {}
  const preferences = draft || saved;
  const items = [{ id: "messages", label: "notificationSettings.messages", description: "notificationSettings.messagesDescription" }, { id: "reminders", label: "notificationSettings.reminders", description: "notificationSettings.remindersDescription" }, { id: "offers", label: "notificationSettings.offers", description: "notificationSettings.offersDescription" }];
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(preferences)); window.dispatchEvent(new Event("booking-preferences")); setDraft(null); notifySuccess(t("notificationSettings.saved")); }
    catch { notifyError(t("common.saveFailed")); }
  }
  return <section className="rounded-2xl border border-line bg-surface p-5 sm:p-8">
    <h2 className="flex items-center gap-2 text-xl font-bold"><Bell aria-hidden size={24} className="text-brand" />{t("notificationSettings.title")}</h2>
    <p className="mt-2 text-sm text-muted-ink">{t("notificationSettings.description")}</p>
    <p className="mt-2 text-xs text-muted-ink">{t("notificationSettings.localNote")}</p>
    <div className="mt-6 space-y-6">{items.map((item) => <label key={item.id} className="flex min-h-11 cursor-pointer items-start justify-between gap-4">
      <span className="min-w-0"><span className="block font-semibold">{t(item.label)}</span><span className="mt-1 block text-sm leading-6 text-muted-ink">{t(item.description)}</span></span>
      <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-brand" aria-label={t(item.label)} checked={Boolean(preferences[item.id])} onChange={(e) => setDraft({ ...preferences, [item.id]: e.target.checked })} />
    </label>)}</div>
    <Button className="mt-6" onClick={save} disabled={!draft}>{t("profile.save")}</Button>
  </section>;
}
