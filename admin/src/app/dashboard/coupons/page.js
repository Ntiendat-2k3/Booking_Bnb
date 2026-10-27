"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import AdminShell from "@/components/templates/AdminShell";
import { adminService } from "@/services/adminService";
import { useTranslations } from "@/i18n/LocaleProvider";

const initial = { code: "", campaign_name: "", discount_type: "percent", discount_value: "",
  max_discount: "", min_subtotal: "0", starts_at: "", ends_at: "", max_total_uses: "",
  max_uses_per_user: "", listing_id: "", host_id: "", city: "", audience: "all",
  notify_users: false };
const money = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value || 0));

/** Admin quản lý mã và xem doanh thu đã thanh toán theo chiến dịch. */
export default function CouponsPage() {
  const t = useTranslations();
  const [form, setForm] = useState(initial);
  const [report, setReport] = useState({ coupons: [], campaigns: [] });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const result = await adminService.getCoupons();
      setReport(result.data || { coupons: [], campaigns: [] });
    } catch (error) { toast.error(error.message || t("coupons.loadFailed")); }
    finally { setLoading(false); }
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function create(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, code: form.code.trim().toUpperCase(),
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        discount_value: Number(form.discount_value), min_subtotal: Number(form.min_subtotal || 0),
        ...Object.fromEntries(["max_discount", "max_total_uses", "max_uses_per_user"].map((key) =>
          [key, form[key] === "" ? null : Number(form[key])])),
        listing_id: form.listing_id || null, host_id: form.host_id || null, city: form.city || null };
      await adminService.createCoupon(data);
      toast.success(t("coupons.created"));
      setForm(initial);
      await load();
    } catch (error) { toast.error(error.message || t("coupons.saveFailed")); }
    finally { setSaving(false); }
  }

  async function toggle(coupon) {
    try {
      await adminService.setCouponActive(coupon.id, !coupon.is_active);
      await load();
    } catch (error) { toast.error(error.message || t("coupons.saveFailed")); }
  }

  const field = (key, type = "text", extra = {}) => <label key={key} className="grid gap-1.5 text-sm">
    <span className="font-medium">{t(`coupons.${key}`)}</span>
    <input className="w-full rounded-lg border border-current/20 bg-transparent px-3 py-2" type={type}
      value={form[key]} onChange={(event) => change(key, event.target.value)} {...extra} />
  </label>;

  return <AdminShell><div className="space-y-7 p-5 md:p-8">
    <div><h1 className="text-2xl font-bold">{t("coupons.title")}</h1><p className="mt-1 opacity-70">{t("coupons.description")}</p></div>
    <form onSubmit={create} className="rounded-xl border border-current/15 p-5">
      <h2 className="mb-4 text-lg font-semibold">{t("coupons.create")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {field("code", "text", { required: true, minLength: 3, maxLength: 40 })}
        {field("campaign_name", "text", { required: true, maxLength: 120 })}
        <label className="grid gap-1.5 text-sm"><span className="font-medium">{t("coupons.discount_type")}</span>
          <select className="rounded-lg border border-current/20 bg-transparent px-3 py-2" value={form.discount_type}
            onChange={(event) => change("discount_type", event.target.value)}>
            <option value="percent">{t("coupons.percent")}</option><option value="fixed">{t("coupons.fixed")}</option>
          </select></label>
        {field("discount_value", "number", { required: true, min: 1,
          max: form.discount_type === "percent" ? 99 : Number.MAX_SAFE_INTEGER })}
        {field("max_discount", "number", { min: 1 })}
        {field("min_subtotal", "number", { min: 0 })}
        {field("starts_at", "datetime-local", { required: true })}
        {field("ends_at", "datetime-local", { required: true })}
        {field("max_total_uses", "number", { min: 1 })}
        {field("max_uses_per_user", "number", { min: 1,
          max: form.audience === "new_guest" ? 1 : undefined })}
        {field("listing_id")}{field("host_id")}{field("city")}
        <label className="grid gap-1.5 text-sm"><span className="font-medium">{t("coupons.audience")}</span>
          <select className="rounded-lg border border-current/20 bg-transparent px-3 py-2" value={form.audience}
            onChange={(event) => change("audience", event.target.value)}>
            <option value="all">{t("coupons.allGuests")}</option>
            <option value="new_guest">{t("coupons.newGuests")}</option>
            <option value="returning_guest">{t("coupons.returningGuests")}</option>
          </select></label>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.notify_users}
        onChange={(event) => change("notify_users", event.target.checked)} />{t("coupons.notify")}</label>
      <button type="submit" disabled={saving} className="mt-5 rounded-lg bg-[#b49a66] px-5 py-2.5 font-semibold text-black disabled:opacity-50">
        {saving ? t("coupons.saving") : t("coupons.create")}</button>
    </form>
    <section><h2 className="mb-3 text-lg font-semibold">{t("coupons.campaigns")}</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{report.campaigns.map((campaign) =>
        <div key={campaign.name} className="rounded-xl border border-current/15 p-4">
          <h3 className="font-semibold">{campaign.name}</h3>
          <p className="mt-2 text-sm">{t("coupons.codes")}: {campaign.codes} · {t("coupons.used")}: {campaign.redeemed_count}</p>
          <p className="text-sm">{t("coupons.revenue")}: {money(campaign.revenue)}</p>
          <p className="text-sm">{t("coupons.discountTotal")}: {money(campaign.discount_total)}</p>
        </div>)}</div>
    </section>
    <section><h2 className="mb-3 text-lg font-semibold">{t("coupons.codes")}</h2>
      {loading ? <p>{t("coupons.loading")}</p> : <div className="overflow-x-auto rounded-xl border border-current/15">
        <table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-current/15">
          <tr>{["code", "campaign_name", "reserved", "used", "revenue", "status"].map((key) =>
            <th key={key} className="p-3">{t(`coupons.${key}`)}</th>)}</tr></thead><tbody>
          {report.coupons.map((coupon) => <tr key={coupon.id} className="border-b border-current/10">
            <td className="p-3 font-semibold">{coupon.code}</td><td className="p-3">{coupon.campaign_name}</td>
            <td className="p-3">{coupon.reserved_count}</td><td className="p-3">{coupon.redeemed_count}</td>
            <td className="p-3">{money(coupon.revenue)}</td><td className="p-3"><button type="button"
              className="rounded-lg border border-current/25 px-3 py-1.5" onClick={() => toggle(coupon)}>
              {t(coupon.is_active ? "coupons.deactivate" : "coupons.activate")}</button></td>
          </tr>)}</tbody></table></div>}
    </section>
  </div></AdminShell>;
}
