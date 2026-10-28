"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, QrCode, X } from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";

const validToken = (value) => /^[A-Za-z0-9_-]{43}$/.test(value);

/** Sở hữu vòng đời camera và bộ giải mã; chỉ chuyển token hợp lệ sang luồng xác nhận lưu trú. */
export default function StayQrScanner({ busy, error, onStart, onScan }) {
  const t = useTranslations();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const scannerGeneration = useRef(0);
  const [cameraState, setCameraState] = useState("idle");
  const [cameraError, setCameraError] = useState("");

  const stopCamera = useCallback(() => {
    scannerGeneration.current++;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState("idle");
  }, []);

  useEffect(() => () => {
    scannerGeneration.current++;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  /** Camera chỉ khởi động sau cú chạm của Host và luôn dừng khi rời màn hoặc quét xong. */
  async function startCamera() {
    if (cameraState !== "idle") return;
    setCameraError("");
    onStart();
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(t("stay.cameraUnsupported")); return;
    }
    const generation = ++scannerGeneration.current;
    setCameraState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false,
        video: { facingMode: { ideal: "environment" } } });
      if (generation !== scannerGeneration.current) {
        stream.getTracks().forEach((track) => track.stop()); return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      const { default: jsQR } = await import("jsqr");
      if (generation !== scannerGeneration.current) return;
      setCameraState("ready");
      let lastFrame = 0;
      const scanFrame = (time) => {
        if (generation !== scannerGeneration.current) return;
        if (time - lastFrame >= 150 && video.videoWidth && video.videoHeight) {
          lastFrame = time;
          const canvas = canvasRef.current;
          const width = Math.min(video.videoWidth, 640);
          const height = Math.round(width * video.videoHeight / video.videoWidth);
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) { stopCamera(); setCameraError(t("stay.cameraFailed")); return; }
          let decoded;
          try {
            context.drawImage(video, 0, 0, width, height);
            const pixels = context.getImageData(0, 0, width, height);
            decoded = jsQR(pixels.data, width, height, { inversionAttempts: "dontInvert" });
          } catch {
            stopCamera(); setCameraError(t("stay.cameraFailed")); return;
          }
          if (decoded?.data) {
            stopCamera();
            if (validToken(decoded.data)) void onScan(decoded.data);
            else setCameraError(t("stay.invalidQr"));
            return;
          }
        }
        frameRef.current = requestAnimationFrame(scanFrame);
      };
      frameRef.current = requestAnimationFrame(scanFrame);
    } catch (error) {
      if (generation !== scannerGeneration.current) return;
      stopCamera();
      setCameraError(t(error?.name === "NotAllowedError" ? "stay.cameraDenied" : "stay.cameraFailed"));
    }
  }

  return (
  <section className="surface-panel space-y-4 p-4 sm:p-6">
    <div className="flex items-center gap-2"><QrCode aria-hidden size={24} className="text-brand" /><h2 className="text-xl font-bold text-ink">{t("stay.scanTitle")}</h2></div>
    <p className="text-sm text-muted-ink">{t("stay.scanHint")}</p>
    <div className="relative overflow-hidden rounded-control border border-line bg-[#0c1710]">
      <video ref={videoRef} autoPlay muted playsInline aria-label={t("stay.cameraPreview")}
        className={`aspect-[4/3] max-h-[55dvh] w-full object-cover ${cameraState === "idle" ? "hidden" : ""}`} />
      {cameraState === "idle" && <div className="grid aspect-[4/3] place-items-center text-center text-white/75"><div><Camera aria-hidden size={42} className="mx-auto mb-3" /><p>{t("stay.cameraReady")}</p></div></div>}
      {cameraState === "ready" && <div aria-hidden className="pointer-events-none absolute inset-[15%] rounded-2xl border-2 border-white/80" />}
    </div>
    <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    {cameraState === "idle" ? <Button onClick={() => void startCamera()} disabled={busy} className="w-full"><Camera aria-hidden size={19} />{t("stay.startCamera")}</Button> :
      <Button variant="secondary" onClick={stopCamera} className="w-full"><X aria-hidden size={18} />{t("stay.stopCamera")}</Button>}
    {cameraState === "requesting" && <p role="status" className="text-sm text-muted-ink">{t("stay.cameraRequesting")}</p>}
    {cameraError && <p role="alert" className="text-sm text-danger">{cameraError}</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </section>
  );
}
