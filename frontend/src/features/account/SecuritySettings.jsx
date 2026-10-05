"use client";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { Lock, WarningCircle } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { useTranslations } from "@/i18n/LocaleProvider";
import PasswordField from "@/components/molecules/PasswordField";
import Button from "@/components/atoms/Button";
import InputField from "@/components/atoms/InputField";
import { validateNewPassword } from "@/lib/authValidation";
import { registerPasskey } from "@/lib/passkey";
import { logout } from "@/store/authThunks";

export default function SecuritySettings({ user }) {
  const t = useTranslations();
  const dispatch = useDispatch();
  const router = useRouter();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwError, setNewPwError] = useState(null);
  const [changingPw, setChangingPw] = useState(false);
  const [passkeys, setPasskeys] = useState([]);
  const [passkeyName, setPasskeyName] = useState("");
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsBusy, setSessionsBusy] = useState(false);
  const [recentRequired, setRecentRequired] = useState(false);
  const canChangePassword = user?.provider === "local";
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    apiFetch("/api/v1/auth/passkeys").then((result) => {
      if (active) setPasskeys(result.data || []);
    }).catch(() => { if (active) notifyError(t("passkey.failed")); });
    return () => { active = false; };
  }, [user?.id, t]);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    apiFetch("/api/v1/auth/sessions").then((result) => {
      if (active) setSessions(result.data || []);
    }).catch(() => { if (active) notifyError(t("sessions.failed")); });
    return () => { active = false; };
  }, [user?.id, t]);

  async function removeSession(item) {
    if (!window.confirm(t("sessions.removeConfirm"))) return;
    setSessionsBusy(true);
    try {
      await apiFetch(`/api/v1/auth/sessions/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      if (item.current) {
        await dispatch(logout());
        router.replace("/login");
      } else setSessions((rows) => rows.filter((row) => row.id !== item.id));
    } catch { notifyError(t("sessions.failed")); }
    finally { setSessionsBusy(false); }
  }

  async function removeOtherSessions() {
    if (!window.confirm(t("sessions.removeOthersConfirm"))) return;
    setSessionsBusy(true);
    try {
      await apiFetch("/api/v1/auth/sessions/revoke-others", { method: "POST", body: {} });
      setSessions((rows) => rows.filter((row) => row.current));
    } catch { notifyError(t("sessions.failed")); }
    finally { setSessionsBusy(false); }
  }

  async function addPasskey() {
    setPasskeyBusy(true);
    try {
      await registerPasskey(passkeyName);
      setPasskeyName("");
      const result = await apiFetch("/api/v1/auth/passkeys");
      setPasskeys(result.data || []);
      notifySuccess(t("passkey.added"));
    } catch (error) {
      if (error?.status === 401) setRecentRequired(true);
      else if (error?.name !== "NotAllowedError") notifyError(t("passkey.failed"));
    } finally { setPasskeyBusy(false); }
  }

  async function removePasskey(id) {
    if (!window.confirm(t("passkey.removeConfirm"))) return;
    setPasskeyBusy(true);
    try {
      await apiFetch(`/api/v1/auth/passkeys/${encodeURIComponent(id)}`, { method: "DELETE" });
      setPasskeys((items) => items.filter((item) => item.id !== id));
      notifySuccess(t("passkey.removed"));
    } catch (error) {
      if (error?.status === 401) setRecentRequired(true);
      else notifyError(t("passkey.removeFailed"));
    }
    finally { setPasskeyBusy(false); }
  }
  async function changePassword(event) {
    event.preventDefault();
    if (!currentPw) { notifyInfo(t("security.required")); return; }
    const error = validateNewPassword(newPw);
    setNewPwError(error);
    if (error) return;
    setChangingPw(true);
    try {
      await apiFetch("/api/v1/users/me/change-password", { method: "POST", body: { current_password: currentPw, new_password: newPw } });
      setCurrentPw(""); setNewPw(""); setNewPwError(null); notifySuccess(t("security.changed"));
    } catch (error) { notifyError(error?.message || t("security.incorrect")); }
    finally { setChangingPw(false); }
  }
  return <section className="surface-panel p-5 sm:p-8">
    <h2 className="flex items-center gap-2 text-xl font-bold"><Lock aria-hidden size={24} className="text-brand" />{t("security.title")}</h2>
    <p className="mt-2 text-sm text-muted-ink">{t("security.description")}</p>
    {!canChangePassword ? <div className="mt-6 flex gap-3 rounded-xl bg-caution/10 p-5 text-caution"><WarningCircle aria-hidden size={24} className="shrink-0" /><div><p className="font-semibold">{t("security.thirdParty")}</p><p className="mt-2 text-sm leading-6">{t("security.connected", { provider: user?.provider })}</p></div></div> :
      <form onSubmit={changePassword} className="mt-6 max-w-md space-y-5">
        <PasswordField label={t("security.currentPassword")} autoComplete="current-password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required disabled={changingPw} />
        <PasswordField label={t("auth.newPassword")} autoComplete="new-password" value={newPw} onChange={(e) => { setNewPw(e.target.value); setNewPwError(null); }} error={newPwError ? t(newPwError) : null} required disabled={changingPw} />
        <Button type="submit" loading={changingPw}>{t("security.updatePassword")}</Button>
      </form>}
    <div className="mt-8 border-t border-line pt-6">
      <h3 className="text-lg font-semibold">{t("passkey.settingsTitle")}</h3>
      <p className="mt-2 text-sm text-muted-ink">{t("passkey.settingsDescription")}</p>
      <ul className="mt-4 space-y-3">{passkeys.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
        <span className="font-medium">{item.name}</span>
        <Button type="button" variant="secondary" disabled={passkeyBusy} onClick={() => removePasskey(item.id)}>{t("common.delete")}</Button>
      </li>)}</ul>
      <div className="mt-4 max-w-md"><InputField label={t("passkey.name")} value={passkeyName} maxLength={80} onChange={(event) => setPasskeyName(event.target.value)} disabled={passkeyBusy} /></div>
      <Button type="button" className="mt-4" loading={passkeyBusy} onClick={addPasskey}>{t("passkey.add")}</Button>
      {recentRequired ? <div className="mt-4 rounded-xl bg-caution/10 p-4 text-sm">
        <p>{t("passkey.reauth")}</p>
        <Button type="button" variant="secondary" className="mt-3" onClick={async () => { await dispatch(logout()); router.push("/login"); }}>{t("passkey.signInAgain")}</Button>
      </div> : null}
    </div>
    <div className="mt-8 border-t border-line pt-6">
      <h3 className="text-lg font-semibold">{t("sessions.title")}</h3>
      <p className="mt-2 text-sm text-muted-ink">{t("sessions.description")}</p>
      <ul className="mt-4 space-y-3">{sessions.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
        <div>
          <p className="font-medium">{item.browser} · {item.os}{item.current ? ` — ${t("sessions.current")}` : ""}</p>
          <p className="text-sm text-muted-ink">{t("sessions.lastActive")}: {new Date(item.lastActiveAt).toLocaleString()}</p>
        </div>
        <Button type="button" variant="secondary" disabled={sessionsBusy} onClick={() => removeSession(item)}>{t("sessions.remove")}</Button>
      </li>)}</ul>
      {sessions.some((item) => !item.current) ? <Button type="button" variant="secondary" className="mt-4" disabled={sessionsBusy} onClick={removeOtherSessions}>{t("sessions.removeOthers")}</Button> : null}
    </div>
  </section>;
}
