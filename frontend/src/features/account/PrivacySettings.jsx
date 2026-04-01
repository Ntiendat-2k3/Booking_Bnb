"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/notify";

import { Shield, Eye, MessageSquare, Mail } from "lucide-react";

export default function PrivacySettings({ user }) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (!user) return;
    async function fetchSettings() {
      try {
        const st = await apiFetch("/api/v1/users/me/settings", {
          method: "GET",
        });
        setSettings(st.data);
      } catch (e) {
        console.error("Lỗi tải cài đặt", e);
      }
    }
    fetchSettings();
  }, [user]);

  async function saveSettings(patch) {
    try {
      const res = await apiFetch("/api/v1/users/me/settings", {
        method: "PATCH",
        body: { ...settings, ...patch },
      });
      setSettings(res.data);
      notifySuccess("Đã cập nhật tùy chọn quyền riêng tư");
    } catch (e) {
      notifyError(e?.message || "Không thể cập nhật cài đặt");
    }
  }

  if (!settings) return (
    <div className="p-12 text-center animate-pulse text-slate-400">Đang tải cài đặt...</div>
  );

  const Toggles = [
    {
      id: "show_profile",
      label: "Hiển thị hồ sơ công khai",
      desc: "Cho phép người khác thấy tên và ảnh đại diện của bạn khi xem các đánh giá.",
      icon: Eye
    },
    {
      id: "show_reviews",
      label: "Hiển thị các đánh giá của tôi",
      desc: "Công khai các đánh giá bạn đã viết cho các phòng đã ở.",
      icon: MessageSquare
    },
    {
      id: "marketing_emails",
      label: "Nhận email quảng cáo",
      desc: "Gửi cho tôi các ưu đãi đặc biệt và tin tức mới nhất từ Booking-bnb.",
      icon: Mail
    }
  ];

  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-50">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Shield size={24} className="text-brand" />
          Quyền riêng tư & Thông báo
        </h2>
        <p className="text-sm text-slate-500">Kiểm soát thông tin hiển thị và cách chúng tôi liên lạc với bạn.</p>
      </div>

      <div className="p-8 space-y-8">
        {Toggles.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="mt-1 p-2 bg-slate-50 rounded-xl text-slate-400">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{item.label}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings[item.id] !== false}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setSettings((s) => ({ ...s, [item.id]: v }));
                    saveSettings({ [item.id]: v });
                  }}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
              </label>
            </div>
          )
        })}
      </div>
    </div>
  );
}
