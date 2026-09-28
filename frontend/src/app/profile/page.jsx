"use client";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Link from "next/link";
import { CalendarBlank, MapPin, Envelope, Phone, User, GearSix, SignOut } from "@phosphor-icons/react";
import { logout } from "@/store/authThunks";
import { useLocale } from "@/i18n/LocaleProvider";
import Avatar from "@/components/atoms/Avatar";
import Badge from "@/components/atoms/Badge";
import Button from "@/components/atoms/Button";
import EmptyState from "@/components/molecules/EmptyState";

export default function ProfilePage() {
  const { locale, t } = useLocale();
  const dispatch = useDispatch();
  const { user, isInitialized } = useSelector((s) => s.auth);
  const [busy, setBusy] = useState(false);
  if (!isInitialized) return <p role="status" className="py-12 text-center text-muted-ink">{t("common.loading")}</p>;
  if (!user) return <EmptyState icon={<User aria-hidden size={30} />} title={t("profile.welcome")} description={t("profile.loginDescription")} action={<Link href="/login" className="inline-flex min-h-11 items-center rounded-xl bg-brand px-5 py-3 font-semibold text-white">{t("auth.loginNow")}</Link>} />;
  const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN", { month: "long", year: "numeric" }) : t("profile.newMember");
  return <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
    <aside className="space-y-6">
      <section className="rounded-2xl border border-line bg-surface p-6 text-center">
        <Avatar src={user.avatar_url} name={user.full_name || t("common.account")} size={112} className="mx-auto" />
        <h1 className="mt-5 break-words text-2xl font-bold tracking-tight text-ink">{user.full_name}</h1>
        <div className="mt-3"><Badge tone="brand">{t(user.role === "host" ? "navigation.hostRole" : user.role === "admin" ? "navigation.adminRole" : "navigation.guestRole")}</Badge></div>
        <Link href="/account/settings?tab=profile" className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-muted-surface">{t("profile.edit")}</Link>
      </section>
      <section className="space-y-4 rounded-2xl border border-line bg-surface p-6">
        <h2 className="font-semibold">{t("profile.verification")}</h2>
        <p className="flex min-w-0 items-center gap-3 text-sm text-muted-ink"><Envelope aria-hidden size={20} className="shrink-0" /><span className="break-all">{user.email || t("profile.emailMissing")}</span></p>
        <p className="flex items-center gap-3 text-sm text-muted-ink"><Phone aria-hidden size={20} className="shrink-0" />{user.phone || t("profile.phoneMissing")}</p>
      </section>
    </aside>
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <h2 className="text-2xl font-bold tracking-tight">{t("profile.about")}</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="flex gap-3"><CalendarBlank aria-hidden size={24} className="shrink-0 text-muted-ink" /><div><p className="text-sm text-muted-ink">{t("profile.joinedSince")}</p><p className="mt-1 font-semibold">{joinDate}</p></div></div>
          <div className="flex gap-3"><MapPin aria-hidden size={24} className="shrink-0 text-muted-ink" /><div><p className="text-sm text-muted-ink">{t("profile.location")}</p><p className="mt-1 font-semibold">{user.location || t("profile.notUpdated")}</p></div></div>
        </div>
        <p className="mt-8 whitespace-pre-line border-t border-line pt-6 leading-7 text-muted-ink">{user.about || t("profile.aboutPlaceholder")}</p>
        {!user.about ? <Link href="/account/settings" className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand underline">{t("profile.addAbout")}</Link> : null}
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/account/settings" className="flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-surface p-5 hover:bg-muted-surface"><GearSix aria-hidden size={24} /><div><p className="font-semibold">{t("navigation.settings")}</p><p className="mt-1 text-xs text-muted-ink">{t("profile.settingsHint")}</p></div></Link>
        <Button variant="secondary" loading={busy} className="justify-start p-5" onClick={async () => { setBusy(true); try { await dispatch(logout()); } finally { setBusy(false); } }}><SignOut aria-hidden size={24} /><span className="text-left"><span className="block">{t("navigation.logout")}</span><span className="mt-1 block text-xs font-normal text-muted-ink">{t("profile.logoutHint")}</span></span></Button>
      </div>
    </div>
  </div>;
}
