"use client";

import { useEffect, useState } from "react";
import { CreditCard, Plus, Trash, CheckCircle } from "@phosphor-icons/react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { apiFetch } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/notify";
import Button from "@/components/atoms/Button";
import IconButton from "@/components/atoms/IconButton";
import InputField from "@/components/atoms/InputField";
import Badge from "@/components/atoms/Badge";
import EmptyState from "@/components/molecules/EmptyState";

const PROVIDERS = ["stripe", "bank", "momo"];
const TYPES = ["card", "ewallet", "bank_transfer"];

export default function PaymentMethods({ user }) {
  const t = useTranslations();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [provider, setProvider] = useState("stripe");
  const [type, setType] = useState("card");
  const [label, setLabel] = useState("");
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    apiFetch("/api/v1/users/me/payment-methods", { method: "GET" })
      .then(res => { if (active) { setItems(res.data?.items || []); setError(false); } })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, attempt]);

  async function addPaymentMethod(event) {
    event.preventDefault();
    if (busy || !label.trim()) return;
    setBusy(true);
    try {
      await apiFetch("/api/v1/users/me/payment-methods", {
        method: "POST", body: { provider, type, label: label.trim() },
      });
      const res = await apiFetch("/api/v1/users/me/payment-methods", { method: "GET" });
      setItems(res.data?.items || []);
      setLabel("");
      setShowForm(false);
      notifySuccess(t("payments.added"));
    } catch (err) { notifyError(err?.message || t("payments.addFailed")); }
    finally { setBusy(false); }
  }

  async function setDefault(id) {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/users/me/payment-methods/${id}/default`, { method: "POST" });
      const res = await apiFetch("/api/v1/users/me/payment-methods", { method: "GET" });
      setItems(res.data?.items || []);
      notifySuccess(t("payments.defaultSaved"));
    } catch (err) { notifyError(err?.message || t("payments.actionFailed")); }
    finally { setBusy(false); }
  }

  async function removePm(id) {
    if (busy || !window.confirm(t("payments.deleteConfirm"))) return;
    setBusy(true);
    try {
      await apiFetch(`/api/v1/users/me/payment-methods/${id}`, { method: "DELETE" });
      const res = await apiFetch("/api/v1/users/me/payment-methods", { method: "GET" });
      setItems(res.data?.items || []);
      notifySuccess(t("payments.deleted"));
    } catch (err) { notifyError(err?.message || t("payments.deleteFailed")); }
    finally { setBusy(false); }
  }

  return <section className="surface-panel p-5 sm:p-8" aria-busy={loading || busy}>
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-xl font-bold">{t("payments.title")}</h2>
        <p className="mt-2 text-sm text-muted-ink">{t("payments.description")}</p></div>
      <IconButton label={t("payments.addTitle")} disabled={busy || loading} onClick={() => setShowForm(true)}><Plus size={20} /></IconButton>
    </div>
    <div className="mt-6">
      {loading ? <p role="status">{t("common.loading")}</p> : error ? <div role="alert">
        <p>{t("common.loadFailed")}</p><Button variant="secondary" className="mt-3" onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>{t("common.retry")}</Button>
      </div> : items.length ? <div className="grid gap-4 xl:grid-cols-2">
        {items.map(item => <article key={item.id} className="rounded-2xl border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CreditCard aria-hidden size={24} className="text-brand" />
            {item.is_default ? <Badge tone="brand">{t("payments.default")}</Badge> : null}
            <div className="flex gap-1">
              {!item.is_default ? <IconButton label={t("payments.makeDefault")} disabled={busy} onClick={() => setDefault(item.id)}><CheckCircle size={20} /></IconButton> : null}
              <IconButton label={t("common.delete")} disabled={busy} onClick={() => removePm(item.id)}><Trash size={20} /></IconButton>
            </div>
          </div>
          <h3 className="mt-3 break-words font-semibold">{item.label}</h3>
          <p className="mt-1 text-sm text-muted-ink">{t(`payments.providers.${item.provider}`)} · {t(`payments.types.${item.type}`)}</p>
        </article>)}
      </div> : <EmptyState icon={<CreditCard aria-hidden size={28} />} title={t("payments.empty")} />}
    </div>
    {showForm ? <form onSubmit={addPaymentMethod} className="mt-6 space-y-4 rounded-2xl bg-muted-surface p-4 sm:p-6">
      <h3 className="font-semibold">{t("payments.addTitle")}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="payment-provider" className="text-sm font-medium">{t("payments.provider")}</label>
          <select id="payment-provider" value={provider} disabled={busy} onChange={event => setProvider(event.target.value)} className="field-control mt-2">{PROVIDERS.map(value => <option key={value} value={value}>{t(`payments.providers.${value}`)}</option>)}</select></div>
        <div><label htmlFor="payment-type" className="text-sm font-medium">{t("payments.type")}</label>
          <select id="payment-type" value={type} disabled={busy} onChange={event => setType(event.target.value)} className="field-control mt-2">{TYPES.map(value => <option key={value} value={value}>{t(`payments.types.${value}`)}</option>)}</select></div>
      </div>
      <InputField id="payment-label" label={t("payments.label")} placeholder={t("payments.labelHint")} value={label} onChange={event => setLabel(event.target.value)} required disabled={busy} />
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy}>{busy ? t("common.processing") : t("payments.confirmAdd")}</Button>
        <Button variant="secondary" disabled={busy} onClick={() => setShowForm(false)}>{t("common.cancel")}</Button></div>
    </form> : null}
  </section>;
}
