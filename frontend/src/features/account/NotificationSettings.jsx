"use client";

import { Bell, Mail, Smartphone, Info } from "lucide-react";
import { useState } from "react";
import { notifySuccess } from "@/lib/notify";

export default function NotificationSettings() {
  const [loading, setLoading] = useState(false);

  const sections = [
    {
      title: "Thông báo từ Booking-bnb",
      items: [
        { id: "messages", label: "Tin nhắn", desc: "Thông báo khi có tin nhắn từ chủ nhà hoặc khách.", icon: Mail },
        { id: "reminders", label: "Nhắc nhở đặt phòng", desc: "Thông báo về lịch trình và các bước tiếp theo.", icon: Bell },
        { id: "offers", label: "Ưu đãi & Khuyến mãi", desc: "Nhận thông tin về các chương trình giảm giá.", icon: Info },
      ]
    }
  ];

  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden text-slate-900">
      <div className="p-8 border-b border-slate-50">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bell size={24} className="text-brand" />
          Cài đặt thông báo
        </h2>
        <p className="text-sm text-slate-500">Chọn cách bạn muốn nhận thông tin từ chúng tôi.</p>
      </div>

      <div className="p-8 space-y-10">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">{section.title}</h3>
            <div className="space-y-6">
              {section.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex gap-4">
                    <div className="mt-1 p-2 bg-slate-50 rounded-xl text-slate-400">
                      <item.icon size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold">{item.label}</h4>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div className="pt-4">
          <button 
            onClick={() => notifySuccess("Đã lưu tùy chọn thông báo")}
            className="w-full sm:w-auto px-8 py-3 bg-brand text-white rounded-2xl font-bold hover:bg-brand-dark transition-all"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
