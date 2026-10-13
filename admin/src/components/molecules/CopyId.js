"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/i18n/LocaleProvider";

export default function CopyId({ value, prefix = "" }) {
  const t = useTranslations();
  if (!value) return <span className="ui-muted">—</span>;

  async function copy() {
    try {
      await navigator.clipboard.writeText(String(value));
      toast.success(t("common.copied"));
    } catch {
      toast.error(t("common.copyFailed"));
    }
  }

  return (
    <button type="button" onClick={copy} className="admin-copy-id" title={String(value)} aria-label={t("common.copyId", { id: value })}>
      <span>{prefix}{String(value).slice(0, 8)}…</span>
      <Copy size={13} aria-hidden="true" />
    </button>
  );
}
