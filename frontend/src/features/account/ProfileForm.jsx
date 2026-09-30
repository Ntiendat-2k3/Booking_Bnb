"use client";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Camera } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api";
import { apiUpload } from "@/lib/apiUpload";
import { notifyError, notifySuccess } from "@/lib/notify";
import { setUser } from "@/store/authSlice";
import { useTranslations } from "@/i18n/LocaleProvider";
import InputField from "@/components/atoms/InputField";
import Button from "@/components/atoms/Button";
import Avatar from "@/components/atoms/Avatar";

export default function ProfileForm() {
  const t = useTranslations();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [about, setAbout] = useState(user?.about || "");
  const [location, setLocation] = useState(user?.location || "");
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  async function saveProfile(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/v1/users/me", { method: "PATCH", body: { full_name: fullName, phone, about, location } });
      dispatch(setUser(res.data));
      notifySuccess(t("profile.updated"));
    } catch (error) { notifyError(error?.errors ? Object.values(error.errors).join(", ") : error?.message || t("profile.updateFailed")); }
    finally { setIsSaving(false); }
  }
  async function uploadAvatar(file) {
    setUploading(true);
    try {
      const body = new FormData(); body.append("image", file);
      const res = await apiUpload("/api/v1/users/me/avatar", body, { method: "POST" });
      dispatch(setUser(res.data?.user));
      notifySuccess(t("profile.avatarUpdated"));
    } catch (error) { notifyError(error?.message || t("profile.avatarFailed")); }
    finally { setUploading(false); }
  }
  if (!user) return null;
  return <section className="surface-panel p-5 sm:p-8">
    <h2 className="text-xl font-bold">{t("profile.title")}</h2><p className="mt-2 text-sm text-muted-ink">{t("profile.description")}</p>
    <div className="mt-6 flex flex-wrap items-center gap-5"><Avatar src={user.avatar_url} name={user.full_name || t("common.account")} size={96} />
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-4 py-2 hover:bg-muted-surface"><Camera aria-hidden size={20} /><span>{t("common.avatar")}</span>
        <input type="file" accept="image/*" className="sr-only" aria-label={t("common.avatar")} disabled={uploading || isSaving} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadAvatar(file); e.target.value = ""; }} />
      </label>{uploading ? <p role="status" className="text-sm text-muted-ink">{t("common.processing")}</p> : null}
    </div>
    <form onSubmit={saveProfile} className="mt-6 space-y-5">
      <fieldset disabled={isSaving || uploading} className="grid min-w-0 gap-5 sm:grid-cols-2">
        <InputField label={t("auth.fullName")} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
        <InputField label={t("profile.phone")} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        <InputField label={t("profile.address")} value={location} onChange={(e) => setLocation(e.target.value)} className="sm:col-span-2" placeholder={t("profile.locationHint")} />
        <div className="sm:col-span-2"><label htmlFor="profile-about" className="mb-2 block text-sm font-semibold">{t("profile.introduction")}</label><textarea id="profile-about" value={about} onChange={(e) => setAbout(e.target.value)} rows={4} placeholder={t("profile.aboutHint")} className="field-control" /></div>
      </fieldset>
      <Button type="submit" loading={isSaving} disabled={uploading}>{t("profile.save")}</Button>
    </form>
  </section>;
}
