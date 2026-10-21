"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { ChatCircleDots } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import { notifyError } from "@/lib/notify";
import { useTranslations } from "@/i18n/LocaleProvider";
import { chatApi } from "@/features/chat/api/chatApi";

export default function ContactHostButton({ listingId }) {
  const t = useTranslations();
  const router = useRouter();
  const user = useSelector((state) => state.auth.user);
  const [busy, setBusy] = useState(false);
  const contactRequest = useRef(null);
  const open = async () => {
    if (busy || !listingId) return;
    if (!user) {
      window.sessionStorage.setItem("booking-chat-next", `/messages?listing=${listingId}`);
      router.push("/login");
      return;
    }
    setBusy(true);
    if (contactRequest.current?.listingId !== listingId) {
      contactRequest.current = { listingId, key: crypto.randomUUID() };
    }
    try {
      const conversation = await chatApi.contact(listingId, contactRequest.current.key);
      contactRequest.current = null;
      router.push(`/messages/${conversation.id}`);
    } catch (error) {
      if (error.status === 401) {
        window.sessionStorage.setItem("booking-chat-next", `/messages?listing=${listingId}`);
        router.push("/login");
      } else notifyError(t("chat.contactFailed"));
    } finally { setBusy(false); }
  };
  return <Button onClick={open} disabled={!listingId} loading={busy} variant="secondary">
    <ChatCircleDots aria-hidden size={18} />{t("contact.host")}
  </Button>;
}
