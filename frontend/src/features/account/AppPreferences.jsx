"use client";

import { Globe, DollarSign, Moon, Zap } from "lucide-react";
import { useState } from "react";
import { notifySuccess } from "@/lib/notify";

export default function AppPreferences() {
  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden text-slate-900">
      <div className="p-8 border-b border-slate-50">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Zap size={24} className="text-brand" />
          Tùy chọn hiển thị
        </h2>
        <p className="text-sm text-slate-500">Cá nhân hóa trải nghiệm duyệt web của bạn.</p>
      </div>

      <div className="p-8 space-y-8">
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Globe size={16} /> Ngôn ngữ
            </label>
            <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand">
              <option>Tiếng Việt</option>
              <option>English</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <DollarSign size={16} /> Tiền tệ
            </label>
            <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand">
              <option>VND (₫)</option>
              <option>USD ($)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
          <div className="flex gap-4">
            <div className="mt-1 p-2 bg-white rounded-xl text-slate-400">
              <Moon size={20} />
            </div>
            <div>
              <h4 className="font-bold">Chế độ tối (Dark Mode)</h4>
              <p className="text-sm text-slate-500">Chuyển sang giao diện nền tối để dịu mắt hơn.</p>
            </div>
          </div>
          <button className="text-sm font-bold text-brand hover:underline">Sắp ra mắt</button>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            onClick={() => notifySuccess("Đã lưu các tùy chọn")}
            className="px-8 py-3 bg-brand text-white rounded-2xl font-bold hover:bg-brand-dark transition-all"
          >
            Lưu tùy chọn
          </button>
        </div>
      </div>
    </div>
  );
}
