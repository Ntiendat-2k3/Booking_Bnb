"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import clsx from "clsx";

const PROVIDERS = [
  { value: "stripe", label: "Stripe" },
  { value: "bank", label: "Bank" },
  { value: "momo", label: "MoMo" },
];

const TYPES = [
  { value: "card", label: "Card" },
  { value: "ewallet", label: "E-wallet" },
  { value: "bank_transfer", label: "Bank transfer" },
];

import { CreditCard, Plus, Trash2, CheckCircle2, Landmark, Wallet } from "lucide-react";

export default function PaymentMethods({ user }) {
  const [pm, setPm] = useState([]);
  const [newProvider, setNewProvider] = useState("stripe");
  const [newType, setNewType] = useState("card");
  const [newLabel, setNewLabel] = useState("");
  const [savingPm, setSavingPm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function loadPm() {
      try {
        const p = await apiFetch("/api/v1/users/me/payment-methods", {
          method: "GET",
        });
        setPm(p.data?.items || []);
      } catch (e) {
        console.error("Lỗi tải payment methods", e);
      }
    }
    loadPm();
  }, [user]);

  async function addPaymentMethod() {
    if (!newLabel.trim()) {
      notifyInfo("Vui lòng nhập tên gợi nhớ (VD: Thẻ Visa)");
      return;
    }
    setSavingPm(true);
    try {
      await apiFetch("/api/v1/users/me/payment-methods", {
        method: "POST",
        body: {
          provider: newProvider,
          type: newType,
          label: newLabel,
        },
      });
      setNewLabel("");
      setShowAddForm(false);
      const p = await apiFetch("/api/v1/users/me/payment-methods", {
        method: "GET",
      });
      setPm(p.data?.items || []);
      notifySuccess("Đã thêm phương thức thanh toán mới");
    } catch (e) {
      notifyError(e?.message || "Không thể thêm");
    } finally {
      setSavingPm(false);
    }
  }

  async function setDefault(id) {
    try {
      await apiFetch(`/api/v1/users/me/payment-methods/${id}/default`, {
        method: "POST",
      });
      const p = await apiFetch("/api/v1/users/me/payment-methods", {
        method: "GET",
      });
      setPm(p.data?.items || []);
      notifySuccess("Đã đặt làm mặc định");
    } catch (e) {
      notifyError(e?.message || "Thao tác thất bại");
    }
  }

  async function removePm(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa phương thức này?")) return;
    try {
      await apiFetch(`/api/v1/users/me/payment-methods/${id}`, {
        method: "DELETE",
      });
      const p = await apiFetch("/api/v1/users/me/payment-methods", {
        method: "GET",
      });
      setPm(p.data?.items || []);
      notifySuccess("Đã xóa phương thức thanh toán");
    } catch (e) {
      notifyError(e?.message || "Không thể xóa");
    }
  }

  const getProviderIcon = (provider) => {
    switch (provider) {
      case "bank": return <Landmark size={24} />;
      case "momo": return <Wallet size={24} />;
      default: return <CreditCard size={24} />;
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden text-slate-900">
      <div className="p-8 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CreditCard size={24} className="text-brand" />
            Phương thức thanh toán
          </h2>
          <p className="text-sm text-slate-500">Quản lý các thẻ và ví điện tử của bạn.</p>
        </div>
        {!showAddForm && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="p-2 bg-slate-50 hover:bg-brand hover:text-white rounded-xl transition-all"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      <div className="p-8">
        {pm.length === 0 ? (
          <div className="text-center py-10 px-4 border-2 border-dashed border-slate-100 rounded-3xl">
            <CreditCard size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium">Bạn chưa lưu phương thức thanh toán nào.</p>
            <button 
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-brand font-bold text-sm hover:underline"
            >
              + Thêm ngay
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pm.map((m) => (
              <div
                key={m.id}
                className={clsx(
                  "relative p-6 border-2 rounded-3xl transition-all group",
                  m.is_default 
                    ? "border-brand bg-brand/[0.02]" 
                    : "border-slate-100 hover:border-slate-200"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className={clsx(
                    "p-3 rounded-2xl",
                    m.is_default ? "bg-brand text-white" : "bg-slate-50 text-slate-400"
                  )}>
                    {getProviderIcon(m.provider)}
                  </div>
                  <div className="flex gap-1">
                    {!m.is_default && (
                      <button
                        onClick={() => setDefault(m.id)}
                        className="p-2 text-slate-400 hover:text-brand transition-colors"
                        title="Đặt làm mặc định"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => removePm(m.id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="font-bold text-lg">{m.label}</div>
                  <div className="text-sm text-slate-500 uppercase tracking-wider mt-1">
                    {m.provider} • {m.type}
                  </div>
                </div>

                {m.is_default && (
                  <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-300">
                    <span className="bg-brand text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">
                      Mặc định
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showAddForm && (
          <div className="mt-8 p-8 bg-slate-50 border border-slate-100 rounded-3xl animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold">Thêm phương thức mới</h3>
              <button onClick={() => setShowAddForm(false)} className="text-sm text-slate-400 hover:text-slate-600">Hủy</button>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nhà cung cấp</label>
                <select
                  value={newProvider}
                  onChange={(e) => setNewProvider(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all font-medium"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Loại</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all font-medium"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tên gợi nhớ</label>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all font-medium"
                  placeholder="VD: Thẻ Visa thanh toán chính"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  disabled={savingPm}
                  onClick={addPaymentMethod}
                  className="w-full px-6 py-4 bg-brand text-white rounded-2xl font-bold shadow-lg shadow-brand/20 hover:bg-brand-dark transition-all disabled:opacity-50"
                >
                  {savingPm ? "Đang xử lý..." : "Xác nhận thêm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
