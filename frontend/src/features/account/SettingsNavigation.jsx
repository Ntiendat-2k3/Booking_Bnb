"use client";

import { 
  User, 
  Shield, 
  CreditCard, 
  Lock, 
  Bell, 
  Settings as SettingsIcon
} from "lucide-react";
import { clsx } from "clsx";

const getMenuItems = (role) => {
  const items = [
    { id: "profile", label: "Hồ sơ cá nhân", icon: User },
    { id: "security", label: "Đăng nhập & Bảo mật", icon: Lock },
    { id: "payment", label: "Thanh toán & Chi trả", icon: CreditCard },
    { id: "privacy", label: "Quyền riêng tư", icon: Shield },
    { id: "notifications", label: "Thông báo", icon: Bell },
    { id: "preferences", label: "Tùy chọn hiển thị", icon: SettingsIcon },
  ];

  return items;
};

export default function SettingsNavigation({ activeTab, onTabChange, role }) {
  const menuItems = getMenuItems(role);
  return (
    <nav className="w-full md:w-64 lg:w-72 shrink-0 md:sticky md:top-24 mb-6 md:mb-0">
      <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-4 md:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 shrink-0 md:shrink w-auto md:w-full",
                isActive
                  ? "bg-brand text-white shadow-lg shadow-brand/10"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon size={18} className={isActive ? "text-white" : "text-slate-400"} />
              <span className="font-semibold text-sm whitespace-nowrap">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  );
}
