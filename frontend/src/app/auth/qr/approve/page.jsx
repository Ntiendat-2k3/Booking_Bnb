"use client";

import { Suspense, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import { ensureCsrf, logout } from "@/store/authThunks";

function ApprovalContent() {
  const t = useTranslations();
  const dispatch = useDispatch();
  const router = useRouter();
  const params = useSearchParams();
  const { user, isInitialized } = useSelector((state) => state.auth);
  const code = params.get("code") || (typeof window !== "undefined" ? window.sessionStorage.getItem("booking-qr-approval") : null);
  const [pairing, setPairing] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!code) return;
    window.sessionStorage.setItem("booking-qr-approval", code);
    window.history.replaceState(null, "", "/auth/qr/approve");
    dispatch(ensureCsrf()).then(() => apiFetch("/api/v1/auth/qr/inspect", { method: "POST", body: { code } }))
      .then((result) => { setPairing(result.data); setStatus("ready"); })
      .catch((error) => {
        if ([404, 409, 410].includes(error?.status)) window.sessionStorage.removeItem("booking-qr-approval");
        setStatus([404, 409, 410].includes(error?.status) ? "invalid" : "error");
      });
  }, [code, dispatch]);

  async function approve() {
    setStatus("busy");
    try {
      await apiFetch("/api/v1/auth/qr/approve", { method: "POST", body: { code } });
      window.sessionStorage.removeItem("booking-qr-approval");
      setStatus("done");
    } catch (error) {
      setStatus(error?.status === 401 ? "reauth" : [404, 409, 410].includes(error?.status) ? "invalid" : "error");
    }
  }

  async function cancel() {
    setStatus("busy");
    try {
      await apiFetch("/api/v1/auth/qr/cancel-mobile", { method: "POST", body: { code } });
      window.sessionStorage.removeItem("booking-qr-approval");
      setStatus("cancelled");
    } catch { setStatus("error"); }
  }

  return <main className="mx-auto max-w-md px-4 py-12">
    <section className="surface-panel p-6 sm:p-8">
      <h1 className="text-2xl font-bold">{t("qr.approveTitle")}</h1>
      {code && status === "loading" ? <p role="status" className="mt-4">{t("common.loading")}</p> : null}
      {(!code && status === "loading") || status === "invalid" ? <p role="alert" className="mt-4 text-danger">{t("qr.expired")}</p> : null}
      {status === "error" ? <p role="alert" className="mt-4 text-danger">{t("qr.failed")}</p> : null}
      {status === "done" ? <p role="status" className="mt-4">{t("qr.done")}</p> : null}
      {status === "cancelled" ? <p role="status" className="mt-4">{t("qr.cancelled")}</p> : null}
      {status === "reauth" ? <div className="mt-4"><p role="alert">{t("qr.reauth")}</p><Button type="button" className="mt-3" onClick={async () => { await dispatch(logout()); router.push("/login"); }}>{t("passkey.signInAgain")}</Button></div> : null}
      {pairing && ["ready", "busy"].includes(status) ? <>
        <p className="mt-4">{t("qr.device")}: <strong>{pairing.device?.browser} · {pairing.device?.os}</strong></p>
        <p className="mt-2">{t("qr.compare")}: <strong className="tracking-widest">{pairing.displayCode}</strong></p>
        {user ? <p className="mt-2 text-sm">{t("qr.asAccount")}: <strong>{user.full_name || user.email}</strong></p> : null}
        <p className="mt-4 text-sm text-muted-ink">{t("qr.onlyApprove")}</p>
        {!isInitialized ? <p role="status" className="mt-4">{t("common.loading")}</p> : user ?
          <Button type="button" className="mt-6" disabled={status === "busy"} onClick={approve}>{t("qr.approve")}</Button> :
          <Link className="mt-6 inline-flex min-h-11 items-center font-semibold text-brand underline" href="/login">{t("qr.signInFirst")}</Link>}
        {isInitialized ? <Button type="button" variant="secondary" className="mt-3" disabled={status === "busy"} onClick={cancel}>{t("qr.cancelMobile")}</Button> : null}
      </> : null}
      <div className="mt-5"><Link href="/" className="text-sm text-muted-ink underline">{t("common.backHome")}</Link></div>
    </section>
  </main>;
}

export default function QrApprovalPage() {
  return <Suspense><ApprovalContent /></Suspense>;
}
