"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { apiFetch, setManualCsrfToken } from "@/lib/api";
import { ensureCsrf } from "@/store/authThunks";
import { setUser } from "@/store/authSlice";
import { afterLoginPath, loginWithPasskey } from "@/lib/passkey";
import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";

/** QR chỉ mang vé ghép đôi; phiên đăng nhập được cấp qua API sau khi điện thoại phê duyệt. */
export default function AlternativeLogin() {
  const t = useTranslations();
  const dispatch = useDispatch();
  const router = useRouter();
  const [pairing, setPairing] = useState(null);
  const [state, setState] = useState("idle");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const completing = useRef(false);

  useEffect(() => {
    if (!pairing) return;
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((pairing.expiresAt - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) setState("expired");
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pairing]);

  useEffect(() => {
    if (!pairing) return;
    let live = true;
    let socket;
    async function check() {
      if (completing.current) return;
      try {
        const result = await apiFetch(`/api/v1/auth/qr/status?id=${encodeURIComponent(pairing.id)}`);
        if (!live) return;
        const next = result.data?.state;
        if (next === "confirmed") {
          completing.current = true;
          setState("completing");
          const completed = await apiFetch("/api/v1/auth/qr/complete", { method: "POST", body: { id: pairing.id } });
          if (!live) return;
          if (completed.data?.csrfToken) setManualCsrfToken(completed.data.csrfToken);
          dispatch(setUser(completed.data.user));
          router.replace("/profile");
        } else if (next === "scanned") {
          setState("scanned");
        } else if (["expired", "cancelled", "consumed"].includes(next) || Date.now() >= pairing.expiresAt) {
          setState(next === "cancelled" ? "cancelled" : "expired");
        }
      } catch {
        if (live && completing.current) setState("error");
      }
    }
    const interval = window.setInterval(check, 3000);
    import("socket.io-client").then(({ io }) => {
      if (!live) return;
      const base = process.env.NEXT_PUBLIC_REALTIME_URL ||
        (process.env.NODE_ENV === "production" ? "https://booking-bnb-api.onrender.com" : "http://localhost:3000");
      socket = io(`${base}/qr-login`, { path: "/socket.io", transports: ["websocket"],
        auth: { id: pairing.id, ticket: pairing.socketTicket }, reconnectionAttempts: 3 });
      socket.on("qr:status", check);
    });
    check();
    return () => { live = false; window.clearInterval(interval); socket?.disconnect(); };
  }, [pairing, dispatch, router]);

  async function passkey() {
    setBusy(true); setState("idle");
    try {
      await dispatch(ensureCsrf());
      const result = await loginWithPasskey();
      if (result.data?.csrfToken) setManualCsrfToken(result.data.csrfToken);
      dispatch(setUser(result.data.user));
      router.replace(afterLoginPath());
    } catch (error) {
      if (error?.name !== "NotAllowedError") setState("passkeyError");
    } finally { setBusy(false); }
  }

  async function startQr() {
    setBusy(true); setState("idle");
    try {
      await dispatch(ensureCsrf());
      const result = await apiFetch("/api/v1/auth/qr/start", { method: "POST", body: {} });
      completing.current = false;
      setPairing(result.data);
      setRemaining(Math.max(0, Math.ceil((result.data.expiresAt - Date.now()) / 1000)));
      setState("waiting");
    } catch { setState("error"); }
    finally { setBusy(false); }
  }

  async function cancelQr() {
    const id = pairing?.id;
    setPairing(null); setState("idle");
    setRemaining(0);
    if (id) {
      try { await apiFetch("/api/v1/auth/qr/cancel", { method: "POST", body: { id } }); } catch {}
    }
  }

  return <div className="mt-5 space-y-3">
    <Button type="button" variant="secondary" className="w-full" onClick={passkey} disabled={busy}>{t("passkey.login")}</Button>
    {!pairing ? <Button type="button" variant="secondary" className="w-full" onClick={startQr} disabled={busy}>{t("qr.login")}</Button> :
      <div className="rounded-xl border border-line bg-surface p-5 text-center">
        <p className="mb-3 font-semibold">{t("qr.scan")}</p>
        <div className="inline-block rounded-lg bg-white p-3"><QRCodeSVG value={pairing.url} size={200} /></div>
        <p className="mt-3 text-sm">{t("qr.compare")} <strong className="tracking-widest">{pairing.displayCode}</strong></p>
        <p className="mt-2 text-sm text-muted-ink">{t("qr.expiresIn", { seconds: remaining })}</p>
        <p role="status" className="mt-2 text-sm text-muted-ink">{t(`qr.${["scanned", "completing", "expired", "cancelled"].includes(state) ? state : state === "error" ? "failed" : "waiting"}`)}</p>
        <Button type="button" variant="secondary" className="mt-3" onClick={["expired", "cancelled", "error"].includes(state) ? async () => { await cancelQr(); await startQr(); } : cancelQr}>{t(["expired", "cancelled", "error"].includes(state) ? "qr.refresh" : "common.cancel")}</Button>
      </div>}
    {state === "passkeyError" ? <p role="alert" className="text-sm text-danger">{t("passkey.failed")}</p> : null}
    {state === "error" && !pairing ? <p role="alert" className="text-sm text-danger">{t("qr.failed")}</p> : null}
  </div>;
}
