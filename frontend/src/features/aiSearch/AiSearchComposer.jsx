"use client";

import { useEffect, useRef, useState } from "react";
import { Microphone, PaperPlaneTilt } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import IconButton from "@/components/atoms/IconButton";
import { useLocale } from "@/i18n/LocaleProvider";

/** Quản lý nhập chữ và giọng nói; chỉ gửi bản chép lời khi khách chủ động bấm tìm phòng. */
export default function AiSearchComposer({ compact, message, setMessage, busy, error, submit, acknowledgeInput }) {
  const { locale } = useLocale();
  const english = locale === "en";
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
      setSpeechError(english
        ? "Voice input is not supported by this browser. Please type your request."
        : "Trình duyệt này chưa hỗ trợ nhập giọng nói. Vui lòng gõ yêu cầu.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = english ? "en-US" : "vi-VN";
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
      const errors = {
        "not-allowed": english ? "Allow microphone access to use voice input." : "Hãy cho phép truy cập micro để nhập giọng nói.",
        "service-not-allowed": english ? "Voice recognition is blocked in this browser." : "Trình duyệt đang chặn nhận dạng giọng nói.",
        "audio-capture": english ? "No microphone is available." : "Không tìm thấy micro khả dụng.",
        "no-speech": english ? "No speech was detected. Please try again." : "Không nghe thấy giọng nói. Vui lòng thử lại.",
        network: english ? "Voice recognition needs a network connection." : "Nhận dạng giọng nói cần kết nối mạng.",
      };
      setSpeechError(errors[event.error] || (english
        ? "Could not recognize speech. Please try again."
        : "Không thể nhận dạng giọng nói. Vui lòng thử lại."));
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
      setSpeechError(english
        ? "Could not start the microphone. Please try again."
        : "Không thể mở micro. Vui lòng thử lại.");
    }
  }

  return <>
    <form onSubmit={handleSubmit} className={compact ? "mt-5 flex flex-col gap-3" : "mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"}>
      <label htmlFor="ai-search-message" className="sr-only">
        {english ? "Describe your stay" : "Mô tả phòng bạn muốn tìm"}
      </label>
      <div className="relative min-w-0 flex-1">
        <textarea
          id="ai-search-message"
          rows={2}
          wrap="soft"
          maxLength={500}
          value={message}
          onFocus={acknowledgeInput}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={english ? "I need a place in Da Lat for four..." : "Tìm homestay ở Đà Lạt cho 4 người..."}
          className="block w-full min-h-[92px] resize-none rounded-control border border-line bg-surface px-4 py-3 pr-16 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:h-full"
        />
        <IconButton
          label={english ? (listening ? "Stop voice input" : "Speak your request") : (listening ? "Dừng nhập giọng nói" : "Nói yêu cầu tìm phòng")}
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
        {english ? "Search" : "Tìm phòng"}
      </Button>
    </form>
    {listening ? <p role="status" className="mt-3 text-sm text-brand">{english ? "Listening… Tap the microphone again to stop. Your browser may send audio to its speech service." : "Đang nghe… Nhấn micro lần nữa để dừng. Trình duyệt có thể gửi âm thanh tới dịch vụ nhận dạng giọng nói."}</p> : null}
    {speechError ? <p role="alert" className="mt-3 text-sm text-danger">{speechError}</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-danger">{error}</p> : null}
  </>;
}
