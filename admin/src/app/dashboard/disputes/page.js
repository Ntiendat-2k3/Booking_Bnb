"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import AdminShell from "@/components/templates/AdminShell";
import AdminPageHeader from "@/components/molecules/AdminPageHeader";
import AdminPagination from "@/components/molecules/AdminPagination";
import Modal from "@/components/molecules/Modal";
import Button from "@/components/atoms/Button";
import { adminService } from "@/services/adminService";
import { fmtDate, money } from "@/lib/BookingUtils";
import { useTranslations } from "@/i18n/LocaleProvider";

const statusLabel = (t, value) => {
  const key = `disputes.providerStatus.${value}`;
  const translated = t(key);
  return translated === key ? value : translated;
};

export default function DisputesPage() {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (signal) => {
    try {
      const response = await adminService.getDisputes({ page, signal });
      if (!signal.aborted) {
        setItems(response.data?.items || []);
        setMeta(response.data?.meta || { total: 0, total_pages: 1 });
      }
    } catch (error) { if (!signal.aborted) toast.error(error?.message || t("disputes.loadFailed")); }
    finally { if (!signal.aborted) setLoading(false); }
  }, [page, t]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function showDetail(id) {
    try {
      const response = await adminService.getDisputeDetail(id);
      const row = response.data?.dispute || null;
      setDetail(row);
      setNote(row?.admin_note || "");
    } catch (error) { toast.error(error?.message || t("disputes.loadFailed")); }
  }

  async function save() {
    if (!detail || busy || note.trim().length < 3) return;
    setBusy(true);
    try {
      await adminService.noteDispute(detail.id, note.trim());
      const response = await adminService.getDisputeDetail(detail.id);
      setDetail(response.data?.dispute || null);
      toast.success(t("disputes.saved"));
    } catch (error) { toast.error(error?.message || t("disputes.saveFailed")); }
    finally { setBusy(false); }
  }

  return <AdminShell><div className="space-y-5">
    <AdminPageHeader icon={CreditCard} title={t("nav.disputes")} description={t("disputes.description")} />
    <div className="overflow-x-auto border ui-border ui-panel">
      <table className="w-full min-w-[660px] text-left text-sm">
        <thead className="border-b ui-border text-xs uppercase tracking-wide ui-muted"><tr>
          <th className="p-4">{t("refunds.bookingCode")}</th><th className="p-4">{t("refunds.amount")}</th>
          <th className="p-4">{t("disputes.status")}</th><th className="p-4">{t("disputes.due")}</th>
          <th className="p-4">{t("common.actions")}</th>
        </tr></thead>
        <tbody>{items.map((row) => <tr key={row.id} className="border-b ui-border last:border-0">
          <td className="p-4 font-semibold">{row.booking_code || row.booking_id}</td>
          <td className="p-4">{money(row.amount)} {row.currency}</td>
          <td className="p-4">{statusLabel(t, row.provider_status)}</td>
          <td className="p-4">{row.evidence_due_at ? fmtDate(row.evidence_due_at) : "—"}</td>
          <td className="p-4"><Button size="sm" onClick={() => void showDetail(row.id)}>{t("common.view")}</Button></td>
        </tr>)}</tbody>
      </table>
      {!loading && items.length === 0 && <p className="p-8 text-center text-sm ui-muted">{t("disputes.noItems")}</p>}
      {loading && <p role="status" className="p-8 text-center text-sm ui-muted">{t("common.loading")}</p>}
    </div>
    <AdminPagination page={page} pageCount={Math.max(1, meta.total_pages)} onPageChange={setPage}
      total={meta.total} pageSize={20} itemLabel={t("nav.disputes")} />
  </div>
  <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={t("disputes.detail")} size="lg">
    {detail && <div className="space-y-4 text-sm">
      <p><strong>{detail.booking_code}</strong> · {money(detail.amount)} {detail.currency}</p>
      <p>{t("disputes.status")}: <strong>{statusLabel(t, detail.provider_status)}</strong></p>
      <p>{t("disputes.reason")}: {detail.reason || "—"}</p>
      <p>{t("disputes.due")}: {detail.evidence_due_at ? fmtDate(detail.evidence_due_at) : "—"}</p>
      <p>Stripe ID: {detail.stripe_dispute_id}</p>
      <a className="inline-block underline underline-offset-4" href="https://dashboard.stripe.com/disputes"
        target="_blank" rel="noopener noreferrer">{t("disputes.openStripe")}</a>
      <label className="grid gap-2 font-semibold">{t("disputes.note")}
        <textarea className="w-full border ui-border ui-panel p-3" rows={4} maxLength={1000}
          value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <Button disabled={busy || note.trim().length < 3} onClick={() => void save()}>{t("disputes.save")}</Button>
    </div>}
  </Modal>
  </AdminShell>;
}
