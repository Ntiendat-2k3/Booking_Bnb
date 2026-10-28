"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Microphone, PaperPlaneTilt } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import IconButton from "@/components/atoms/IconButton";
import { useLocale } from "@/i18n/LocaleProvider";

/** Quản lý nhập chữ và giọng nói; chỉ gửi bản chép lời khi khách chủ động bấm tìm phòng. */
export default function AiSearchComposer({ compact, message, setMessage, busy, error, submit, acknowledgeInput }) {
  const { locale, t } = useLocale();
  const messageId = useId();
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState("");

  useEffect(() => () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.abort();
    recognitionRef.current = null;
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    void submit(message);
  }

  function handleVoiceInput() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("unsupported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = locale === "en" ? "en-US" : "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    setSpeechError("");
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) setMessage((current) => [current.trim(), transcript].filter(Boolean).join(" ").slice(0, 500));
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted") return;
      setSpeechError(["not-allowed", "service-not-allowed", "audio-capture", "no-speech", "network"]
        .includes(event.error) ? event.error : "failed");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    try {
      recognition.start();
      setListening(true);
      acknowledgeInput();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setSpeechError("start");
    }
  }

  return <>
    <form onSubmit={handleSubmit} className={compact ? "mt-5 flex flex-col gap-3" : "mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"}>
      <label htmlFor={messageId} className="sr-only">
        {t("aiSearch.messageLabel")}
      </label>
      <div className="relative min-w-0 flex-1">
        <textarea
          id={messageId}
          data-ai-search-input
          rows={2}
          wrap="soft"
          maxLength={500}
          value={message}
          onFocus={acknowledgeInput}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t("aiSearch.placeholder")}
          className="block w-full min-h-[92px] resize-none rounded-control border border-line bg-surface px-4 py-3 pr-16 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:h-full"
        />
        <IconButton
          label={t(listening ? "aiSearch.stopVoice" : "aiSearch.speak")}
          aria-pressed={listening}
          onClick={handleVoiceInput}
          variant={listening ? "brand" : "surface"}
          className="absolute right-2 top-2"
        >
          <Microphone aria-hidden size={20} weight={listening ? "fill" : "regular"} />
        </IconButton>
      </div>
      <Button type="submit" disabled={!message.trim() || listening} loading={busy} className="shrink-0 self-center">
        <PaperPlaneTilt aria-hidden size={18} />
        {t("aiSearch.search")}
      </Button>
    </form>
    {listening ? <p role="status" className="mt-3 text-sm text-brand">{t("aiSearch.listening")}</p> : null}
    {speechError ? <p role="alert" className="mt-3 text-sm text-danger">{t(`aiSearch.speechErrors.${speechError}`)}</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-danger">{t(error)}</p> : null}
  </>;
}
