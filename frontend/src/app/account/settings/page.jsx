"use client";
import { useTranslations } from "@/i18n/LocaleProvider";


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
import Button from "@/components/atoms/Button";

export default function AccountSettingsPage() {
  const t = useTranslations();
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
          notifyInfo(t("account.loginRequired"));
          router.push("/login");
          return;
        }
        notifyError(t("account.loadFailed"));
      } finally {
        setLoading(false);
      }
    }
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <div className="surface-panel p-8 text-center">
          <p className="text-muted-ink">{t("account.loginPrompt")}</p>
          <Button href="/login" className="mt-4">{t("auth.loginNow")}</Button>
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
    <div className="mx-auto max-w-6xl py-4 sm:py-6">
      <div className="mb-10">
        <h1 className="page-heading">{t("account.title")}</h1>
        <p className="mt-2 text-lg text-muted-ink">{t("account.description")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[256px_minmax(0,1fr)] gap-6 lg:gap-10">
        <aside className="w-full">
          <SettingsNavigation 
            activeTab={activeTab} 
            onTabChange={(id) => {
              setActiveTab(id);
              window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
            }} 
            role={user?.role} 
          />
        </aside>
        
        <section className="w-full min-w-0 flex flex-col" aria-label={t("account.title")}>
          <div className="min-h-[600px] w-full">
            {loading ? (
              <div className="flex items-center justify-center p-20 w-full">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-muted-ink font-medium">{t("account.loading")}</p>
                </div>
              </div>
            ) : (
              <div className="reveal w-full overflow-visible">
                {renderContent()}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
