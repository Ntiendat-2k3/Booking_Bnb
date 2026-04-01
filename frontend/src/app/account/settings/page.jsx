"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { notifyError, notifyInfo } from "@/lib/notify";
import { setUser } from "@/store/authSlice";

import SettingsNavigation from "@/features/account/SettingsNavigation";
import ProfileForm from "@/features/account/ProfileForm";
import PrivacySettings from "@/features/account/PrivacySettings";
import PaymentMethods from "@/features/account/PaymentMethods";
import SecuritySettings from "@/features/account/SecuritySettings";
import NotificationSettings from "@/features/account/NotificationSettings";
import AppPreferences from "@/features/account/AppPreferences";

export default function AccountSettingsPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const isInitialized = useSelector((s) => s.auth.isInitialized);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (isInitialized && !user) {
      router.push("/login");
    }
  }, [isInitialized, user, router]);

  useEffect(() => {
    async function loadMe() {
      if (!user) return;
      setLoading(true);
      try {
        const me = await apiFetch("/api/v1/users/me", { method: "GET" });
        dispatch(setUser(me.data));
      } catch (e) {
        if (e?.status === 401) {
          notifyInfo("Bạn cần đăng nhập để xem trang này");
          router.push("/login");
          return;
        }
        notifyError("Không tải được account user info");
      } finally {
        setLoading(false);
      }
    }
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) {
    return (
      <div className="max-w-3xl px-4 py-10 mx-auto">
        <div className="p-8 text-center bg-white shadow-xl border rounded-3xl">
          <p className="text-slate-600">Bạn cần đăng nhập để tiếp tục.</p>
          <button 
            onClick={() => router.push("/login")}
            className="mt-4 px-6 py-2 bg-brand text-white rounded-xl font-medium"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "profile": return <ProfileForm />;
      case "privacy": return <PrivacySettings user={user} />;
      case "payment": return <PaymentMethods user={user} />;
      case "security": return <SecuritySettings user={user} />;
      case "notifications": return <NotificationSettings />;
      case "preferences": return <AppPreferences />;
      default: return <ProfileForm />;
    }
  };

  return (
    <div className="max-w-6xl px-4 py-12 mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Cài đặt tài khoản</h1>
        <p className="mt-2 text-lg text-slate-500">
          Quản lý thông tin cá nhân, bảo mật và các tùy chọn trải nghiệm của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[256px_1fr] gap-10">
        <aside className="w-full">
          <SettingsNavigation 
            activeTab={activeTab} 
            onTabChange={(id) => {
              setActiveTab(id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }} 
            role={user?.role} 
          />
        </aside>
        
        <main className="w-full min-w-0 flex flex-col">
          <div className="min-h-[600px] w-full bg-white rounded-3xl border border-slate-100 p-1 md:p-6 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-20 w-full">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-400 font-medium">Đang tải dữ liệu...</p>
                </div>
              </div>
            ) : (
              <div className="w-full animate-in fade-in duration-500 overflow-visible">
                {renderContent()}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
