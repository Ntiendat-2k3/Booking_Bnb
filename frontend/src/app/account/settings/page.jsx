"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { apiUpload } from "@/lib/apiUpload";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { setUser } from "@/store/authSlice";

const PROVIDERS = [
  { value: "vnpay", label: "VNPay" },
  { value: "bank", label: "Bank" },
  { value: "momo", label: "MoMo" },
  { value: "stripe", label: "Stripe" },
];

const TYPES = [
  { value: "card", label: "Card" },
  { value: "ewallet", label: "E-wallet" },
  { value: "bank_transfer", label: "Bank transfer" },
];

export default function AccountSettingsPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  const [profileLoading, setProfileLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [settings, setSettings] = useState(null);
  const [pm, setPm] = useState([]);

  const [newProvider, setNewProvider] = useState("vnpay");
  const [newType, setNewType] = useState("card");
  const [newLabel, setNewLabel] = useState("");
  const [savingPm, setSavingPm] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const canChangePassword = useMemo(() => user?.provider === "local", [user]);

  useEffect(() => {
    if (user === null) {
      // Might still be bootstrapping. Delay redirect a bit.
      const t = setTimeout(() => {
        if (!user) router.push("/login");
      }, 300);
      return () => clearTimeout(t);
    }
  }, [router, user]);

  async function loadAll() {
    if (!user) return;
    setProfileLoading(true);
    try {
      const me = await apiFetch("/api/v1/users/me", { method: "GET" });
      dispatch(setUser(me.data));
      setFullName(me.data?.full_name || "");
      setPhone(me.data?.phone || "");

      const st = await apiFetch("/api/v1/users/me/settings", { method: "GET" });
      setSettings(st.data);

      const p = await apiFetch("/api/v1/users/me/payment-methods", { method: "GET" });
      setPm(p.data?.items || []);
    } catch (e) {
      if (e?.status === 401) {
        notifyInfo("Bạn cần đăng nhập để xem trang này");
        router.push("/login");
        return;
      }
      notifyError(e?.message || "Không tải được account settings");
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function saveProfile() {
    try {
      const res = await apiFetch("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName, phone }),
      });
      dispatch(setUser(res.data));
      notifySuccess("Đã cập nhật thông tin");
    } catch (e) {
      notifyError(e?.message || "Không thể cập nhật thông tin");
    }
  }

  async function uploadAvatar(file) {
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await apiUpload("/api/v1/users/me/avatar", fd, { method: "POST" });
      dispatch(setUser(res.data?.user));
      notifySuccess("Đã cập nhật ảnh đại diện");
    } catch (e) {
      notifyError(e?.message || "Không thể upload avatar");
    }
  }

  async function saveSettings(patch) {
    try {
      const res = await apiFetch("/api/v1/users/me/settings", {
        method: "PATCH",
        body: JSON.stringify({ ...settings, ...patch }),
      });
      setSettings(res.data);
      notifySuccess("Đã cập nhật cài đặt");
    } catch (e) {
      notifyError(e?.message || "Không thể cập nhật cài đặt");
    }
  }

  async function addPaymentMethod() {
    if (!newLabel.trim()) {
      notifyInfo("Bạn cần nhập label");
      return;
    }
    setSavingPm(true);
    try {
      await apiFetch("/api/v1/users/me/payment-methods", {
        method: "POST",
        body: JSON.stringify({ provider: newProvider, type: newType, label: newLabel }),
      });
      setNewLabel("");
      const p = await apiFetch("/api/v1/users/me/payment-methods", { method: "GET" });
      setPm(p.data?.items || []);
      notifySuccess("Đã thêm phương thức thanh toán");
    } catch (e) {
      notifyError(e?.message || "Không thể thêm phương thức thanh toán");
    } finally {
      setSavingPm(false);
    }
  }

  async function setDefault(id) {
    try {
      await apiFetch(`/api/v1/users/me/payment-methods/${id}/default`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const p = await apiFetch("/api/v1/users/me/payment-methods", { method: "GET" });
      setPm(p.data?.items || []);
      notifySuccess("Đã đặt mặc định");
    } catch (e) {
      notifyError(e?.message || "Không thể đặt mặc định");
    }
  }

  async function removePm(id) {
    if (!confirm("Xóa phương thức này?") ) return;
    try {
      await apiFetch(`/api/v1/users/me/payment-methods/${id}`, {
        method: "DELETE",
      });
      const p = await apiFetch("/api/v1/users/me/payment-methods", { method: "GET" });
      setPm(p.data?.items || []);
      notifySuccess("Đã xóa");
    } catch (e) {
      notifyError(e?.message || "Không thể xóa");
    }
  }

  async function changePassword() {
    setChangingPw(true);
    try {
      await apiFetch("/api/v1/users/me/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      setCurrentPw("");
      setNewPw("");
      notifySuccess("Đã đổi mật khẩu");
    } catch (e) {
      notifyError(e?.message || "Không thể đổi mật khẩu");
    } finally {
      setChangingPw(false);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border bg-white p-6">Bạn cần đăng nhập.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Account settings</h1>
      <p className="mt-1 text-slate-600">Cập nhật hồ sơ, quyền riêng tư và phương thức thanh toán.</p>

      {profileLoading ? (
        <div className="mt-6 text-slate-600">Đang tải...</div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Profile */}
          <section className="rounded-2xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Hồ sơ</h2>
            </div>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row">
              <div className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.avatar_url || "https://i.pravatar.cc/150"}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                />
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 w-full text-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatar(f);
                    e.target.value = "";
                  }}
                />
              </div>

              <div className="flex-1 grid gap-3">
                <label className="text-sm font-medium">
                  Họ tên
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    placeholder="Nguyễn Văn A"
                  />
                </label>
                <label className="text-sm font-medium">
                  Số điện thoại
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    placeholder="09xxxxxxxx"
                  />
                </label>
                <div>
                  <button
                    onClick={saveProfile}
                    className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
                  >
                    Lưu hồ sơ
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Quyền riêng tư</h2>
            <div className="mt-3 grid gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings?.show_profile !== false}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setSettings((s) => ({ ...s, show_profile: v }));
                    saveSettings({ show_profile: v });
                  }}
                />
                Hiển thị hồ sơ (tên + avatar) khi người khác xem đánh giá
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings?.show_reviews !== false}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setSettings((s) => ({ ...s, show_reviews: v }));
                    saveSettings({ show_reviews: v });
                  }}
                />
                Hiển thị đánh giá của tôi
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings?.marketing_emails === true}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setSettings((s) => ({ ...s, marketing_emails: v }));
                    saveSettings({ marketing_emails: v });
                  }}
                />
                Nhận email marketing
              </label>
            </div>
          </section>

          {/* Payment methods */}
          <section className="rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Phương thức thanh toán</h2>
              <button
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                onClick={loadAll}
              >
                Tải lại
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {pm.length === 0 ? (
                <div className="text-sm text-slate-600">Chưa có phương thức nào.</div>
              ) : (
                <div className="space-y-2">
                  {pm.map((m) => (
                    <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">
                          {m.label} {m.is_default ? <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Default</span> : null}
                        </div>
                        <div className="text-xs text-slate-600">
                          {m.provider} • {m.type}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!m.is_default && (
                          <button
                            onClick={() => setDefault(m.id)}
                            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                          >
                            Đặt mặc định
                          </button>
                        )}
                        <button
                          onClick={() => removePm(m.id)}
                          className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-3">
                <label className="text-sm font-medium">
                  Provider
                  <select
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Type
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Label
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                    placeholder="VD: Thẻ Visa **** 4242"
                  />
                </label>
                <div className="sm:col-span-3">
                  <button
                    disabled={savingPm}
                    onClick={addPaymentMethod}
                    className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
                  >
                    Thêm phương thức
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Change password */}
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Bảo mật</h2>
            {!canChangePassword ? (
              <div className="mt-2 text-sm text-slate-600">
                Tài khoản Google không hỗ trợ đổi mật khẩu trong hệ thống.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Mật khẩu hiện tại
                  <input
                    type="password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  />
                </label>
                <label className="text-sm font-medium">
                  Mật khẩu mới
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  />
                </label>
                <div className="sm:col-span-2">
                  <button
                    disabled={changingPw}
                    onClick={changePassword}
                    className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
                  >
                    Đổi mật khẩu
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
