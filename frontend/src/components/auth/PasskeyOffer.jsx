"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { apiFetch } from "@/lib/api";
import { registerPasskey } from "@/lib/passkey";
import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";

/** Chỉ hỏi sau lần đăng nhập chủ động và lưu lựa chọn riêng cho từng tài khoản. */
export default function PasskeyOffer() {
  const t = useTranslations();
  const user = useSelector((state) => state.auth.user);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user?.id || window.sessionStorage.getItem("booking-passkey-offer") !== "1") return;
    window.sessionStorage.removeItem("booking-passkey-offer");
    if (window.sessionStorage.getItem("booking-qr-approval")) return;
    const key = `booking-passkey-choice:${user.id}`;
    if (window.localStorage.getItem(key)) return;
    let active = true;
    apiFetch("/api/v1/auth/passkeys").then((result) => {
      if (active && !result.data?.length) setOpen(true);
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.id]);

  if (!open || !user?.id) return null;
  const choiceKey = `booking-passkey-choice:${user.id}`;
  async function enable() {
    setBusy(true);
    setError(false);
    try {
      await registerPasskey();
      window.localStorage.setItem(choiceKey, "enabled");
      setOpen(false);
    } catch (cause) {
      if (cause?.name !== "NotAllowedError") setError(true);
    } finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="passkey-offer-title" className="surface-panel w-full max-w-md p-6 shadow-xl">
      <h2 id="passkey-offer-title" className="text-xl font-bold">{t("passkey.offerTitle")}</h2>
      <p className="mt-3 text-sm text-muted-ink">{t("passkey.offerDescription")}</p>
      {error ? <p role="alert" className="mt-3 text-sm text-danger">{t("passkey.failed")}</p> : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" onClick={enable} loading={busy}>{t("passkey.enable")}</Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={() => { window.localStorage.setItem(choiceKey, "later"); setOpen(false); }}>{t("passkey.later")}</Button>
      </div>
    </section>
  </div>;
}
