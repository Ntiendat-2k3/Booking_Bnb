"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import AdminShell from "@/components/templates/AdminShell";
import AdminPageHeader from "@/components/molecules/AdminPageHeader";
import AdminPagination from "@/components/molecules/AdminPagination";
import Modal from "@/components/molecules/Modal";
import Button from "@/components/atoms/Button";
import Badge from "@/components/atoms/Badge";
import Select from "@/components/atoms/Select";
import { adminService } from "@/services/adminService";
import { fmtDate, money } from "@/lib/BookingUtils";
import { useTranslations } from "@/i18n/LocaleProvider";

const tone = (status) => status === "succeeded" ? "emerald" :
  status === "failed" || status === "manual_review" ? "rose" : "amber";

const eventLabel = (t, action) => {
  const key = `refunds.events.${action}`;
  const translated = t(key);
  return translated === key ? action : translated;
};

export default function RefundsPage() {
  const t = useTranslations();
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  const load = useCallback(async (signal) => {
    try {
      const response = await adminService.getRefunds({ status, page, limit: 20, signal });
      if (!signal?.aborted) {
        setItems(response.data?.items || []);
        setMeta(response.data?.meta || { total: 0, total_pages: 1 });
      }
    } catch (error) {
      if (!signal?.aborted) toast.error(error?.message || t("refunds.loadFailed"));
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [page, status, t]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, revision]);

  async function showDetail(id) {
    try {
      const response = await adminService.getRefundDetail(id);
      setDetail(response.data?.refund || null);
      setNote("");
    } catch (error) { toast.error(error?.message || t("refunds.loadFailed")); }
  }

  async function act(action) {
    if (!detail || busy || note.trim().length < 3) return;
    setBusy(true);
    try {
      await adminService.actOnRefund(detail.id, action, note.trim());
      toast.success(t("refunds.actionSuccess"));
      const response = await adminService.getRefundDetail(detail.id);
      setDetail(response.data?.refund || null);
      setNote("");
      setRevision((value) => value + 1);
    } catch (error) { toast.error(error?.message || t("refunds.actionFailed")); }
    finally { setBusy(false); }
  }

  return <AdminShell><div className="space-y-5">
    <AdminPageHeader icon={RotateCcw} title={t("nav.refunds")} description={t("refunds.description")}>
      <Select aria-label={t("common.status")} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
        {["all", "requested", "processing", "succeeded", "failed", "manual_review"].map((value) =>
          <option key={value} value={value}>{t(`refunds.${value}`)}</option>)}
      </Select>
    </AdminPageHeader>
    <div className="overflow-x-auto border ui-border ui-panel">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="border-b ui-border text-xs uppercase tracking-wide ui-muted"><tr>
          <th className="p-4">{t("refunds.bookingCode")}</th><th className="p-4">{t("refunds.amount")}</th>
          <th className="p-4">{t("common.status")}</th><th className="p-4">{t("common.created")}</th>
          <th className="p-4">{t("common.actions")}</th>
        </tr></thead>
        <tbody>{items.map((refund) => <tr key={refund.id} className="border-b ui-border last:border-0">
          <td className="p-4 font-semibold">{refund.booking_code || refund.booking_id}</td>
          <td className="p-4">{money(refund.amount)} {refund.currency}</td>
          <td className="p-4"><Badge tone={tone(refund.status)}>{t(`refunds.${refund.status}`)}</Badge></td>
          <td className="p-4 ui-muted">{fmtDate(refund.created_at)}</td>
          <td className="p-4"><Button size="sm" onClick={() => void showDetail(refund.id)}>{t("common.view")}</Button></td>
        </tr>)}</tbody>
      </table>
      {!loading && items.length === 0 && <p className="p-8 text-center text-sm ui-muted">{t("refunds.noItems")}</p>}
      {loading && <p role="status" className="p-8 text-center text-sm ui-muted">{t("common.loading")}</p>}
    </div>
    <AdminPagination page={page} pageCount={Math.max(1, meta.total_pages)} onPageChange={setPage}
      total={meta.total} pageSize={20} itemLabel={t("nav.refunds")} />
  </div>

  <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={t("refunds.detail")} size="lg">
    {detail && <div className="space-y-5 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <p><span className="ui-muted">{t("refunds.bookingCode")}: </span><strong>{detail.booking_code}</strong></p>
        <p><span className="ui-muted">{t("refunds.amount")}: </span><strong>{money(detail.amount)} {detail.currency}</strong></p>
        <p><span className="ui-muted">{t("common.status")}: </span><Badge tone={tone(detail.status)}>{t(`refunds.${detail.status}`)}</Badge></p>
        <p><span className="ui-muted">{t("refunds.providerId")}: </span>{detail.stripe_refund_id || "—"}</p>
        <p><span className="ui-muted">{t("refunds.reason")}: </span>{detail.failure_reason || "—"}</p>
        <p><span className="ui-muted">{t("refunds.source")}: </span>{detail.source_key}</p>
      </div>
      {detail.cancellation && <div className="border-t ui-border pt-4">
        <p>{t("refunds.amount")}: {money(detail.cancellation.refund_amount)} {detail.currency}</p>
        <p className="ui-muted">{t("common.created")}: {fmtDate(detail.cancellation.created_at)}</p>
      </div>}
      <section className="border-t ui-border pt-4"><h3 className="font-semibold">{t("refunds.history")}</h3>
        <ul className="mt-2 space-y-2">{detail.events?.map((event) =>
          <li key={event.id} className="border-l-2 ui-border pl-3"><strong>{eventLabel(t, event.action)}</strong>
            <span className="ml-2 ui-muted">{fmtDate(event.created_at)}</span>
            {event.note && <p className="ui-muted">{event.note}</p>}</li>)}</ul>
      </section>
      {detail.status !== "succeeded" && <section className="space-y-3 border-t ui-border pt-4">
        <label className="grid gap-2 font-semibold">{t("refunds.note")}
          <textarea className="w-full border ui-border ui-panel p-3" rows={3} maxLength={1000}
            value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <div className="flex flex-wrap gap-2">
          {["failed", "manual_review"].includes(detail.status) && <Button disabled={busy || note.trim().length < 3}
            onClick={() => void act("retry")}>{t("refunds.retry")}</Button>}
          <Button variant="outline" disabled={busy || note.trim().length < 3}
            onClick={() => void act("review")}>{t("refunds.review")}</Button>
        </div>
      </section>}
    </div>}
  </Modal>
  </AdminShell>;
}
