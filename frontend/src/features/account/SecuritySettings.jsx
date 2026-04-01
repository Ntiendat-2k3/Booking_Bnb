"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/notify";

import { Lock, Key, CheckCircle2, AlertCircle } from "lucide-react";

export default function SecuritySettings({ user }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const canChangePassword = user?.provider === "local";

  async function changePassword() {
    if (!currentPw || !newPw) {
      notifyInfo("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    setChangingPw(true);
    try {
      await apiFetch("/api/v1/users/me/change-password", {
        method: "POST",
        body: {
          current_password: currentPw,
          new_password: newPw,
        },
      });
      setCurrentPw("");
      setNewPw("");
      notifySuccess("Đổi mật khẩu thành công");
    } catch (e) {
      notifyError(e?.message || "Mật khẩu hiện tại không đúng");
    } finally {
      setChangingPw(false);
    }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden text-slate-900">
      <div className="p-8 border-b border-slate-50">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Lock size={24} className="text-brand" />
          Bảo mật & Mật khẩu
        </h2>
        <p className="text-sm text-slate-500">Đảm bảo tài khoản của bạn luôn được bảo vệ.</p>
      </div>

      <div className="p-8">
        {!canChangePassword ? (
          <div className="flex gap-4 p-6 bg-amber-50 rounded-3xl border border-amber-100 text-amber-800">
            <AlertCircle className="shrink-0" />
            <div>
              <p className="font-bold">Đăng nhập qua bên thứ ba</p>
              <p className="text-sm mt-1 opacity-90">
                Tài khoản của bạn được liên kết qua {user?.provider}. 
                Bạn không cần mật khẩu riêng cho Booking-bnb.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-md space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Key size={16} className="text-slate-400" />
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all font-medium"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Lock size={16} className="text-slate-400" />
                Mật khẩu mới
              </label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all font-medium"
                placeholder="Tối thiểu 6 ký tự"
              />
            </div>

            <div className="pt-2">
              <button
                disabled={changingPw}
                onClick={changePassword}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-50"
              >
                {changingPw ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <CheckCircle2 size={18} />
                )}
                Cập nhật mật khẩu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
