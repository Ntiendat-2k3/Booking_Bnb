"use client";

import { useEffect, useRef, useState } from "react";
import { ChatCircleDots, CheckCircle, X } from "@phosphor-icons/react";
import { useSelector } from "react-redux";
import { apiFetch } from "@/lib/api";
import { notifyError } from "@/lib/notify";
import { useTranslations } from "@/i18n/LocaleProvider";
import Button from "@/components/atoms/Button";
import InputField from "@/components/atoms/InputField";
import IconButton from "@/components/atoms/IconButton";

export default function ContactHostButton({ hostId }) {
  const t = useTranslations();
  const dialogRef = useRef(null);
  const timerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const currentUser = useSelector((s) => s.auth.user);

  const [email, setEmail] = useState(currentUser ? currentUser.email : "");
  const [phone, setPhone] = useState(currentUser ? currentUser.phone || "" : "");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (dialog && !dialog.open) dialog.showModal();
    return () => { clearTimeout(timerRef.current); dialog?.close(); document.body.style.overflow = overflow; trigger?.focus(); };
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !content) return;
    
    setLoading(true);
    try {
      await apiFetch(`/api/v1/hosts/${hostId}/contact`, {
        method: "POST",
        body: { email, phone, content },
      });
      setSuccess(true);
      timerRef.current = setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setContent("");
      }, 3000);
    } catch (error) {
      console.error(error);
      notifyError(t("contact.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => { if (!email) setEmail(currentUser?.email || ""); if (!phone) setPhone(currentUser?.phone || ""); setSuccess(false); setIsOpen(true); }}
        variant="secondary"
      >
        <ChatCircleDots aria-hidden size={18} />
        {t("contact.host")}
      </Button>

      {isOpen && (
        <dialog ref={dialogRef} onCancel={() => setIsOpen(false)}
          className="fixed inset-0 z-[100] m-0 flex h-dvh w-screen max-w-none items-center justify-center bg-transparent p-4 backdrop:bg-black/55"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-host-title"
        >
          <div className="surface-panel max-h-[85dvh] w-full max-w-md overflow-y-auto p-6 shadow-float">
            {success ? (
              <div className="py-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-positive/10 text-positive">
                  <CheckCircle aria-hidden size={34} weight="fill" />
                </div>
                <h3 id="contact-host-title" className="mb-2 text-xl font-bold text-ink">
                  {t("contact.successTitle")}
                </h3>
                <p className="text-sm leading-6 text-muted-ink">
                  {t("contact.successDescription")}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <h3 id="contact-host-title" className="text-xl font-bold text-ink">
                    {t("contact.title")}
                  </h3>
                  <IconButton
                    onClick={() => setIsOpen(false)}
                    label={t("common.close")}
                  >
                    <X aria-hidden size={20} />
                  </IconButton>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <InputField
                    label={t("contact.email")} disabled={loading}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("contact.emailPlaceholder")}
                  />
                  <InputField
                    label={t("contact.phone")} disabled={loading}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("contact.phonePlaceholder")}
                  />
                  <div>
                    <label htmlFor="contact-message" className="mb-2 block text-sm font-semibold text-ink">
                      {t("contact.message")}
                    </label>
                    <textarea
                      id="contact-message" disabled={loading}
                      required
                      rows={4}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={t("contact.messagePlaceholder")}
                      className="field-control resize-none"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !email || !content}
                    loading={loading}
                    className="w-full"
                    size="lg"
                  >
                    {t("contact.send")}
                  </Button>
                </form>
              </>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}
