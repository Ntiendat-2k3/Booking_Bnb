"use client";
import { useState } from "react";
import { Lock, WarningCircle } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { useTranslations } from "@/i18n/LocaleProvider";
import PasswordField from "@/components/molecules/PasswordField";
import Button from "@/components/atoms/Button";

export default function SecuritySettings({ user }) {
  const t = useTranslations();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const canChangePassword = user?.provider === "local";
  async function changePassword(event) {
    event.preventDefault();
    if (!currentPw || !newPw) { notifyInfo(t("security.required")); return; }
    setChangingPw(true);
    try {
      await apiFetch("/api/v1/users/me/change-password", { method: "POST", body: { current_password: currentPw, new_password: newPw } });
      setCurrentPw(""); setNewPw(""); notifySuccess(t("security.changed"));
    } catch (error) { notifyError(error?.message || t("security.incorrect")); }
    finally { setChangingPw(false); }
  }
  return <section className="surface-panel p-5 sm:p-8">
    <h2 className="flex items-center gap-2 text-xl font-bold"><Lock aria-hidden size={24} className="text-brand" />{t("security.title")}</h2>
    <p className="mt-2 text-sm text-muted-ink">{t("security.description")}</p>
    {!canChangePassword ? <div className="mt-6 flex gap-3 rounded-xl bg-caution/10 p-5 text-caution"><WarningCircle aria-hidden size={24} className="shrink-0" /><div><p className="font-semibold">{t("security.thirdParty")}</p><p className="mt-2 text-sm leading-6">{t("security.connected", { provider: user?.provider })}</p></div></div> :
      <form onSubmit={changePassword} className="mt-6 max-w-md space-y-5">
        <PasswordField label={t("security.currentPassword")} autoComplete="current-password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required disabled={changingPw} />
        <PasswordField label={t("auth.newPassword")} autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required disabled={changingPw} />
        <Button type="submit" loading={changingPw}>{t("security.updatePassword")}</Button>
      </form>}
  </section>;
}
