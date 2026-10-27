"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { QrCode, ArrowClockwise, DownloadSimple } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api";
import { useLocale } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";

const stayDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
});

/** Token QR chỉ giữ trong bộ nhớ màn hình; mỗi lần tạo mới vô hiệu hóa mã trước đó. */
export default function StayQrPanel({ booking }) {
  const { t } = useLocale();
  const verificationQrRef = useRef(null);
  const [qr, setQr] = useState(null);
  const [verificationQr, setVerificationQr] = useState(null);
  const [resending, setResending] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [resendState, setResendState] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const purpose = booking.stay_status === "checked_in" ? "check_out" : "check_in";
  const today = stayDateFormatter.format(new Date(now));
  const canIssue = purpose === "check_out"
    ? ["confirmed", "completed"].includes(booking.status) && today >= booking.check_out
    : booking.status === "confirmed" && today >= booking.check_in && today < booking.check_out;
  const remaining = qr ? Math.max(0, Math.ceil((new Date(qr.expires_at).getTime() - now) / 1000)) : 0;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), qr ? 1000 : 30_000);
    return () => clearInterval(interval);
  }, [qr]);

  useEffect(() => {
    if (booking.status !== "confirmed" || booking.stay_status !== "not_checked_in") return;
    let active = true;
    apiFetch(`/api/v1/bookings/${booking.id}/check-in-qr`)
      .then((response) => { if (active) setVerificationQr(response.data); })
      .catch(() => { if (active) setVerificationQr(null); });
    return () => { active = false; };
  }, [booking.id, booking.status, booking.stay_status]);

  async function issue() {
    setLoading(true);
    setError(false);
    try {
      const response = await apiFetch(`/api/v1/bookings/${booking.id}/stay-qr`, {
        method: "POST", body: { purpose },
      });
      setQr(response.data);
      setNow(Date.now());
    } catch {
      setError(true);
      setQr(null);
    } finally { setLoading(false); }
  }

  async function resend() {
    setResending(true); setResendState("");
    try {
      await apiFetch(`/api/v1/bookings/${booking.id}/confirmation-email/resend`, {
        method: "POST", body: {},
      });
      setResendState("sent");
    } catch { setResendState("failed"); }
    finally { setResending(false); }
  }

  async function rotate() {
    setRotating(true); setResendState("");
    try {
      const response = await apiFetch(`/api/v1/bookings/${booking.id}/check-in-qr/rotate`, {
        method: "POST", body: {},
      });
      setVerificationQr(response.data);
      setResendState("sent");
    } catch { setResendState("failed"); }
    finally { setRotating(false); }
  }

  function downloadVerificationQr() {
    const canvas = verificationQrRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `booking-${booking.id}-qr.png`;
    link.click();
  }

  if (booking.stay_status === "checked_out") return null;
  return <section className="mt-5 space-y-3 border-t border-line pt-5" aria-label={t("stay.qrTitle")}>
    <div className="flex items-center gap-2"><QrCode aria-hidden size={22} className="text-brand" /><h4 className="font-bold text-ink">{t(purpose === "check_in" ? "stay.checkInQr" : "stay.checkOutQr")}</h4></div>
    {verificationQr && purpose === "check_in" && <div className="space-y-3 rounded-control border border-line bg-surface p-4 text-center">
      <QRCodeCanvas ref={verificationQrRef} value={verificationQr.token} size={190} includeMargin title={t("stay.verificationQrTitle")} role="img" aria-label={t("stay.verificationQrTitle")} className="mx-auto max-w-full" />
      <p className="text-xs text-muted-ink">{t("stay.verificationQrHint")}</p>
      <Button size="sm" variant="secondary" className="w-full" onClick={downloadVerificationQr}>
        <DownloadSimple aria-hidden size={18} />{t("stay.downloadQr")}
      </Button>
      <Button size="sm" variant="secondary" className="w-full" onClick={resend} loading={resending}>{t("stay.resendConfirmation")}</Button>
      <Button size="sm" variant="secondary" className="w-full" onClick={rotate} loading={rotating}>{t("stay.rotateQr")}</Button>
      {resendState && <p role="status" className="text-xs text-muted-ink">{t(resendState === "sent" ? "stay.resendQueued" : "stay.resendFailed")}</p>}
    </div>}
    {purpose === "check_out" && !canIssue && booking.status === "confirmed" &&
      <p className="text-xs text-muted-ink">{t("stay.checkOutStartsOn", { date: booking.check_out.split("-").reverse().join("/") })}</p>}
    {canIssue && <>
      {remaining > 0 && <div className="rounded-control border border-line bg-surface p-4 text-center">
        <QRCodeSVG value={qr.token} size={190} includeMargin title={t("stay.qrTitle")} className="mx-auto max-w-full" />
        <p className="mt-2 text-xs font-medium text-muted-ink">{t("stay.expiresIn", { seconds: remaining })}</p>
      </div>}
      <Button size="sm" variant="secondary" className="w-full" onClick={issue} loading={loading}>
        <ArrowClockwise aria-hidden size={18} />{t(qr ? "stay.refreshQr" : "stay.createQr")}
      </Button>
      {error && <p role="alert" className="text-sm text-danger">{t("stay.qrFailed")}</p>}
    </>}
  </section>;
}
